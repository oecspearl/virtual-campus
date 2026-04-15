'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, History, Copy, X, Users } from 'lucide-react';
import { useWhiteboardCollaboration } from '@/app/hooks/useWhiteboardCollaboration';
import CollaboratorCursors from '@/app/components/whiteboard/CollaboratorCursors';

// Excalidraw must be dynamically imported (no SSR)
import dynamic from 'next/dynamic';
import '@excalidraw/excalidraw/index.css';

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full bg-gray-50"><div className="flex flex-col items-center gap-2"><svg viewBox="0 0 48 48" className="w-10 h-10"><rect x="6" y="30" width="14" height="12" rx="2.5" fill="#6366f1" opacity="0.9"><animate attributeName="y" values="30;27;30" dur="1.5s" repeatCount="indefinite"/></rect><rect x="22" y="26" width="14" height="16" rx="2.5" fill="#3b82f6" opacity="0.9"><animate attributeName="y" values="26;23;26" dur="1.5s" begin="0.2s" repeatCount="indefinite"/></rect><rect x="14" y="16" width="14" height="14" rx="2.5" fill="#8b5cf6" opacity="0.9"><animate attributeName="y" values="16;13;16" dur="1.5s" begin="0.4s" repeatCount="indefinite"/></rect></svg><span className="text-xs text-gray-400">Loading canvas...</span></div></div> }
);

interface WhiteboardEditorProps {
  whiteboardId?: string;
  initialElements?: any[];
  initialAppState?: Record<string, any>;
  initialFrames?: Array<{ id: string; label: string }>;
  title?: string;
  collaboration?: 'view_only' | 'comment_only' | 'collaborate';
  onSave?: (data: { elements: any[]; appState: Record<string, any> }) => void;
  onTitleChange?: (title: string) => void;
  autoSaveInterval?: number;
  showToolbar?: boolean;
  className?: string;
  /** User identity for real-time collaboration */
  userId?: string;
  userName?: string;
}

export default function WhiteboardEditor({
  whiteboardId,
  initialElements = [],
  initialAppState = {},
  title = 'Untitled Board',
  collaboration = 'collaborate',
  onSave,
  onTitleChange,
  autoSaveInterval = 30000,
  showToolbar = true,
  className = '',
  userId,
  userName,
}: WhiteboardEditorProps) {
  const [excalidrawAPI, setExcalidrawAPIState] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [boardTitle, setBoardTitle] = useState(title);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [currentAppState, setCurrentAppState] = useState<any>(initialAppState);
  const autoSaveRef = useRef<NodeJS.Timeout | null>(null);
  const hasChangesRef = useRef(false);

  // Real-time collaboration
  const realtimeEnabled = collaboration === 'collaborate' && !!whiteboardId && !!userId;
  const {
    collaborators,
    broadcastChanges,
    updatePointer,
    setExcalidrawAPI: setCollabAPI,
    isCollaborating,
  } = useWhiteboardCollaboration({
    whiteboardId: whiteboardId || '',
    userId: userId || '',
    userName: userName || 'Anonymous',
    enabled: realtimeEnabled,
  });

  const handleSetAPI = useCallback((api: any) => {
    setExcalidrawAPIState(api);
    setCollabAPI(api);
  }, [setCollabAPI]);

  // Auto-save
  useEffect(() => {
    if (!whiteboardId || !autoSaveInterval || collaboration === 'view_only') return;

    autoSaveRef.current = setInterval(() => {
      if (hasChangesRef.current && excalidrawAPI) {
        handleSave();
      }
    }, autoSaveInterval);

    return () => {
      if (autoSaveRef.current) clearInterval(autoSaveRef.current);
    };
  }, [whiteboardId, autoSaveInterval, excalidrawAPI, collaboration]);

  const handleSave = useCallback(async () => {
    if (!excalidrawAPI || isSaving) return;

    setIsSaving(true);
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();

      if (whiteboardId) {
        const res = await fetch(`/api/whiteboards/${whiteboardId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            elements,
            app_state: {
              viewBackgroundColor: appState.viewBackgroundColor,
              gridSize: appState.gridSize,
              theme: appState.theme,
            },
          }),
        });

        if (res.ok) {
          setLastSaved(new Date());
          hasChangesRef.current = false;
        }
      }

      onSave?.({ elements, appState });
    } catch (error) {
      console.error('Error saving whiteboard:', error);
    } finally {
      setIsSaving(false);
    }
  }, [excalidrawAPI, whiteboardId, isSaving, onSave]);

  const handleSaveVersion = async () => {
    if (!whiteboardId) return;
    const label = prompt('Version label (optional):') ?? undefined;
    try {
      const res = await fetch(`/api/whiteboards/${whiteboardId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });
      if (res.ok) {
        await handleSave();
        loadVersions();
      }
    } catch (error) {
      console.error('Error saving version:', error);
    }
  };

  const loadVersions = async () => {
    if (!whiteboardId) return;
    try {
      const res = await fetch(`/api/whiteboards/${whiteboardId}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.versions || []);
      }
    } catch (error) {
      console.error('Error loading versions:', error);
    }
  };

  const restoreVersion = async (version: any) => {
    if (!excalidrawAPI || !confirm('Restore this version? Current changes will be overwritten.')) return;
    excalidrawAPI.updateScene({
      elements: version.elements,
      appState: version.app_state || {},
    });
    if (whiteboardId) {
      await fetch(`/api/whiteboards/${whiteboardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          elements: version.elements,
          app_state: version.app_state || {},
          frames: version.frames || [],
        }),
      });
    }
    setShowVersions(false);
  };

  const handleTitleSubmit = () => {
    setEditingTitle(false);
    onTitleChange?.(boardTitle);
    if (whiteboardId) {
      fetch(`/api/whiteboards/${whiteboardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: boardTitle }),
      });
    }
  };

  const isReadOnly = collaboration === 'view_only';

  return (
    <div className={`flex flex-col bg-white rounded-lg overflow-hidden ${className}`} style={{ height: '100%', minHeight: 400 }}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2 min-w-0">
            {editingTitle ? (
              <input
                type="text"
                value={boardTitle}
                onChange={(e) => setBoardTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                className="px-2 py-1 text-sm font-medium border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            ) : (
              <button
                onClick={() => !isReadOnly && setEditingTitle(true)}
                className="text-sm font-medium text-gray-900 truncate hover:text-blue-600"
                title={isReadOnly ? boardTitle : 'Click to rename'}
              >
                {boardTitle}
              </button>
            )}

            {lastSaved && (
              <span className="text-xs text-gray-400 flex-shrink-0">
                Saved {lastSaved.toLocaleTimeString()}
              </span>
            )}

            {/* Collaborator avatars */}
            {collaborators.length > 0 && (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-gray-200">
                <Users className="w-3.5 h-3.5 text-gray-400" />
                <div className="flex -space-x-1.5">
                  {collaborators.slice(0, 5).map((c) => (
                    <div
                      key={c.userId}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-white"
                      style={{ backgroundColor: c.color }}
                      title={c.name}
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
                {collaborators.length > 5 && (
                  <span className="text-xs text-gray-400">+{collaborators.length - 5}</span>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {!isReadOnly && (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  title="Save"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>

                {whiteboardId && (
                  <button
                    onClick={handleSaveVersion}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    title="Save Version"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Snapshot
                  </button>
                )}
              </>
            )}

            {whiteboardId && (
              <button
                onClick={() => {
                  setShowVersions(!showVersions);
                  if (!showVersions) loadVersions();
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-md border ${
                  showVersions
                    ? 'text-blue-700 bg-blue-50 border-blue-300'
                    : 'text-gray-700 bg-white border-gray-300 hover:bg-gray-50'
                }`}
                title="Version History"
              >
                <History className="w-3.5 h-3.5" />
                History
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 relative">
        {/* Remote cursors overlay */}
        {realtimeEnabled && collaborators.length > 0 && (
          <CollaboratorCursors
            collaborators={collaborators}
            appState={currentAppState}
          />
        )}

        {/* Version sidebar */}
        {showVersions && (
          <div className="absolute right-0 top-0 bottom-0 w-64 bg-white border-l border-gray-200 z-20 overflow-y-auto shadow-lg">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
              <span className="text-sm font-medium text-gray-700">Version History</span>
              <button onClick={() => setShowVersions(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 space-y-1.5">
              {versions.length === 0 ? (
                <p className="text-xs text-gray-500 text-center py-4">No saved versions yet</p>
              ) : (
                versions.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => restoreVersion(v)}
                    className="w-full text-left p-2 rounded-md hover:bg-blue-50 border border-gray-100 hover:border-blue-200 transition-colors"
                  >
                    <div className="text-xs font-medium text-gray-800 truncate">
                      {v.label || 'Untitled version'}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {new Date(v.created_at).toLocaleString()}
                    </div>
                    {v.saver?.name && (
                      <div className="text-xs text-gray-400 mt-0.5">by {v.saver.name}</div>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Excalidraw canvas — needs explicit height for Excalidraw to render */}
        <div className="absolute inset-0">
          <Excalidraw
            excalidrawAPI={handleSetAPI}
            initialData={{
              elements: initialElements,
              appState: {
                viewBackgroundColor: '#ffffff',
                ...initialAppState,
              },
            }}
            viewModeEnabled={isReadOnly}
            onChange={(elements: any[], appState: any) => {
              hasChangesRef.current = true;
              setCurrentAppState(appState);
              if (realtimeEnabled) {
                broadcastChanges(elements);
              }
            }}
            onPointerUpdate={realtimeEnabled ? (payload: any) => {
              if (payload.pointer) {
                updatePointer({ x: payload.pointer.x, y: payload.pointer.y });
              }
            } : undefined}
            UIOptions={{
              canvasActions: {
                loadScene: !isReadOnly,
                saveToActiveFile: false,
                export: { saveFileToDisk: true },
                clearCanvas: !isReadOnly,
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
