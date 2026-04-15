'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { getSupabaseClient } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Collaborator {
  userId: string;
  name: string;
  color: string;
  pointer: { x: number; y: number } | null;
}

interface ElementChange {
  senderId: string;
  added: any[];
  updated: any[];
  deleted: string[];
}

interface UseWhiteboardCollaborationOptions {
  whiteboardId: string;
  userId: string;
  userName: string;
  enabled?: boolean;
}

/** Generate a deterministic color from a user ID */
function userColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

export function useWhiteboardCollaboration({
  whiteboardId,
  userId,
  userName,
  enabled = true,
}: UseWhiteboardCollaborationOptions) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const excalidrawAPIRef = useRef<any>(null);
  const prevElementsRef = useRef<Map<string, number>>(new Map());
  const isApplyingRemoteRef = useRef(false);
  const broadcastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<ElementChange | null>(null);
  const color = useRef(userColor(userId)).current;

  // Set the excalidraw API reference
  const setExcalidrawAPI = useCallback((api: any) => {
    excalidrawAPIRef.current = api;
  }, []);

  // Initialize channel
  useEffect(() => {
    if (!enabled || !whiteboardId || !userId) return;

    const supabase = getSupabaseClient();
    const channel = supabase.channel(`wb:${whiteboardId}`, {
      config: { broadcast: { self: false } },
    });

    // Listen for element changes from other users
    channel.on('broadcast', { event: 'element-changes' }, ({ payload }: { payload: ElementChange }) => {
      if (payload.senderId === userId) return;
      applyRemoteChanges(payload);
    });

    // Track presence for cursors
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const collabs: Collaborator[] = [];
        for (const key of Object.keys(state)) {
          const presences = state[key] as any[];
          for (const p of presences) {
            if (p.userId !== userId) {
              collabs.push({
                userId: p.userId,
                name: p.name,
                color: p.color,
                pointer: p.pointer || null,
              });
            }
          }
        }
        setCollaborators(collabs);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            userId,
            name: userName,
            color,
            pointer: null,
          });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
      if (broadcastTimerRef.current) clearTimeout(broadcastTimerRef.current);
    };
  }, [whiteboardId, userId, userName, enabled, color]);

  // Apply remote element changes to the local scene
  const applyRemoteChanges = useCallback((changes: ElementChange) => {
    const api = excalidrawAPIRef.current;
    if (!api) return;

    isApplyingRemoteRef.current = true;

    try {
      const currentElements = api.getSceneElements() as any[];
      const elementsMap = new Map(currentElements.map((el: any) => [el.id, el]));

      // Apply deletions
      for (const id of changes.deleted) {
        elementsMap.delete(id);
      }

      // Apply additions
      for (const el of changes.added) {
        elementsMap.set(el.id, el);
      }

      // Apply updates (last-write-wins by version)
      for (const el of changes.updated) {
        const existing = elementsMap.get(el.id);
        if (!existing || el.version >= existing.version) {
          elementsMap.set(el.id, el);
        }
      }

      api.updateScene({ elements: Array.from(elementsMap.values()) });

      // Update our tracking map
      for (const [id, el] of elementsMap) {
        prevElementsRef.current.set(id, (el as any).version || 0);
      }
    } finally {
      // Clear synchronously — Excalidraw's updateScene triggers onChange
      // synchronously, so the flag is checked before it's cleared.
      // Use requestAnimationFrame to clear after the current call stack.
      requestAnimationFrame(() => {
        isApplyingRemoteRef.current = false;
      });
    }
  }, []);

  // Diff and broadcast local changes (debounced)
  const broadcastChanges = useCallback((elements: any[]) => {
    if (isApplyingRemoteRef.current || !channelRef.current) return;

    const prev = prevElementsRef.current;
    const added: any[] = [];
    const updated: any[] = [];
    const currentIds = new Set<string>();

    for (const el of elements) {
      currentIds.add(el.id);
      const prevVersion = prev.get(el.id);
      if (prevVersion === undefined) {
        added.push(el);
      } else if (el.version !== prevVersion) {
        updated.push(el);
      }
    }

    // Detect deletions
    const deleted: string[] = [];
    for (const id of prev.keys()) {
      if (!currentIds.has(id)) {
        deleted.push(id);
      }
    }

    // Update tracking
    prev.clear();
    for (const el of elements) {
      prev.set(el.id, el.version || 0);
    }

    // Only broadcast if there are actual changes
    if (added.length === 0 && updated.length === 0 && deleted.length === 0) return;

    // Debounce: batch changes over 80ms
    const change: ElementChange = { senderId: userId, added, updated, deleted };

    if (pendingChangesRef.current) {
      // Merge with pending
      pendingChangesRef.current.added.push(...change.added);
      pendingChangesRef.current.updated.push(...change.updated);
      pendingChangesRef.current.deleted.push(...change.deleted);
    } else {
      pendingChangesRef.current = change;
    }

    if (broadcastTimerRef.current) return; // Already scheduled

    broadcastTimerRef.current = setTimeout(() => {
      const pending = pendingChangesRef.current;
      pendingChangesRef.current = null;
      broadcastTimerRef.current = null;

      if (pending && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'element-changes',
          payload: pending,
        });
      }
    }, 80);
  }, [userId]);

  // Update pointer position for cursor tracking
  const updatePointer = useCallback((pointer: { x: number; y: number }) => {
    if (!channelRef.current) return;
    channelRef.current.track({
      userId,
      name: userName,
      color,
      pointer,
    });
  }, [userId, userName, color]);

  return {
    collaborators,
    broadcastChanges,
    updatePointer,
    setExcalidrawAPI,
    isCollaborating: enabled && collaborators.length > 0,
  };
}
