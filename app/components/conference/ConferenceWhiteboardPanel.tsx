'use client';

import React, { useState, useEffect, useCallback } from 'react';
import WhiteboardEditor from '@/app/components/whiteboard/WhiteboardEditor';
import { Layout, ChevronLeft, ChevronRight, Plus, X, Eye, Edit3 } from 'lucide-react';

interface ConferenceWhiteboardPanelProps {
  conferenceId: string;
  isHost: boolean;
  isVisible: boolean;
  onClose: () => void;
  userId?: string;
  userName?: string;
}

interface ConferenceBoard {
  id: string;
  whiteboard_id: string;
  collaboration: 'view_only' | 'comment_only' | 'collaborate';
  available_from: string;
  is_active: boolean;
  sort_order: number;
  whiteboard: {
    id: string;
    title: string;
    description?: string;
    elements: any[];
    app_state: Record<string, any>;
    frames: any[];
    collaboration: string;
    created_by: string;
    creator?: { id: string; name: string; email: string };
  };
}

export default function ConferenceWhiteboardPanel({
  conferenceId,
  isHost,
  isVisible,
  onClose,
  userId,
  userName,
}: ConferenceWhiteboardPanelProps) {
  const [boards, setBoards] = useState<ConferenceBoard[]>([]);
  const [activeBoard, setActiveBoard] = useState<ConferenceBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingBoard, setAddingBoard] = useState(false);
  const [newBoardTitle, setNewBoardTitle] = useState('');

  const fetchBoards = useCallback(async () => {
    try {
      const res = await fetch(`/api/conferences/${conferenceId}/whiteboards`);
      if (res.ok) {
        const data = await res.json();
        const fetchedBoards = data.whiteboards || [];
        setBoards(fetchedBoards);

        // Set active board
        const active = fetchedBoards.find((b: ConferenceBoard) => b.is_active);
        if (active) {
          setActiveBoard(active);
        } else if (fetchedBoards.length > 0 && !activeBoard) {
          setActiveBoard(fetchedBoards[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching boards:', error);
    } finally {
      setLoading(false);
    }
  }, [conferenceId]);

  useEffect(() => {
    if (isVisible) {
      fetchBoards();
    }
  }, [isVisible, fetchBoards]);

  // Poll for board activation changes (every 5s for non-hosts)
  useEffect(() => {
    if (!isVisible || isHost) return;
    const interval = setInterval(fetchBoards, 5000);
    return () => clearInterval(interval);
  }, [isVisible, isHost, fetchBoards]);

  const activateBoard = async (board: ConferenceBoard) => {
    setActiveBoard(board);

    if (isHost) {
      try {
        await fetch(`/api/conferences/${conferenceId}/whiteboards/${board.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_active: true }),
        });
        fetchBoards();
      } catch (error) {
        console.error('Error activating board:', error);
      }
    }
  };

  const createNewBoard = async () => {
    if (!newBoardTitle.trim()) return;

    try {
      setAddingBoard(false);
      const res = await fetch(`/api/conferences/${conferenceId}/whiteboards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          create_new: true,
          title: newBoardTitle.trim(),
          collaboration: 'collaborate',
          available_from: 'on_join',
        }),
      });

      if (res.ok) {
        setNewBoardTitle('');
        fetchBoards();
      }
    } catch (error) {
      console.error('Error creating board:', error);
    }
  };

  const removeBoard = async (board: ConferenceBoard) => {
    if (!confirm(`Remove "${board.whiteboard.title}" from this session?`)) return;

    try {
      await fetch(`/api/conferences/${conferenceId}/whiteboards/${board.id}`, {
        method: 'DELETE',
      });

      if (activeBoard?.id === board.id) {
        setActiveBoard(null);
      }
      fetchBoards();
    } catch (error) {
      console.error('Error removing board:', error);
    }
  };

  const handleSave = useCallback((data: { elements: any[]; appState: Record<string, any> }) => {
    // Board auto-saves via WhiteboardEditor
  }, []);

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Board tabs */}
      <div className="flex items-center gap-1 px-2 py-1.5 bg-gray-800 border-b border-gray-700 overflow-x-auto">
        {boards.map((board) => (
          <div
            key={board.id}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium flex-shrink-0 cursor-pointer transition-colors ${
              activeBoard?.id === board.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <button
              onClick={() => activateBoard(board)}
              className="flex items-center gap-1"
            >
              <Layout className="w-3 h-3" />
              <span className="truncate max-w-[100px]">{board.whiteboard.title}</span>
            </button>
            {isHost && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeBoard(board);
                }}
                className="ml-1 opacity-60 hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}

        {isHost && (
          <>
            {addingBoard ? (
              <div className="flex items-center gap-1 flex-shrink-0">
                <input
                  type="text"
                  value={newBoardTitle}
                  onChange={(e) => setNewBoardTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createNewBoard()}
                  placeholder="Board name..."
                  className="w-28 px-2 py-0.5 text-xs bg-gray-700 text-white border border-gray-600 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <button
                  onClick={createNewBoard}
                  disabled={!newBoardTitle.trim()}
                  className="px-2 py-0.5 text-xs text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => { setAddingBoard(false); setNewBoardTitle(''); }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingBoard(true)}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-400 hover:text-white hover:bg-gray-700 flex-shrink-0"
              >
                <Plus className="w-3 h-3" />
                Add
              </button>
            )}
          </>
        )}

        <div className="flex-1" />
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-white rounded flex-shrink-0"
          title="Close whiteboard panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Board canvas */}
      <div className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-1.5">{[0,1,2,3].map(i=><div key={i} className="w-2 h-2 rounded-full" style={{background:['#6366f1','#8b5cf6','#3b82f6','#06b6d4'][i],animation:`cwbDot 1.4s ease-in-out ${i*0.16}s infinite`}} />)}<style>{`@keyframes cwbDot{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-8px)}}`}</style></div>
          </div>
        ) : activeBoard ? (
          <WhiteboardEditor
            whiteboardId={activeBoard.whiteboard.id}
            initialElements={activeBoard.whiteboard.elements}
            initialAppState={activeBoard.whiteboard.app_state}
            title={activeBoard.whiteboard.title}
            collaboration={isHost ? 'collaborate' : activeBoard.collaboration as any}
            onSave={handleSave}
            showToolbar={false}
            autoSaveInterval={15000}
            userId={userId}
            userName={userName}
          />
        ) : boards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Layout className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">No whiteboards attached to this session</p>
            {isHost && (
              <button
                onClick={() => setAddingBoard(true)}
                className="mt-3 px-3 py-1.5 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                Create a Board
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Select a board to view
          </div>
        )}
      </div>
    </div>
  );
}
