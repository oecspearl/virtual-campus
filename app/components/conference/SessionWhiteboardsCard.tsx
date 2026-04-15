'use client';

import React, { useState, useEffect } from 'react';
import { Layout, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import WhiteboardViewer from '@/app/components/whiteboard/WhiteboardViewer';

interface SessionBoard {
  id: string;
  whiteboard: {
    id: string;
    title: string;
    description?: string;
    thumbnail_url?: string;
    elements: any[];
    app_state: Record<string, any>;
  };
  created_at: string;
}

interface SessionWhiteboardsCardProps {
  courseId: string;
  maxVisible?: number;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export default function SessionWhiteboardsCard({
  courseId,
  maxVisible = 4,
  collapsible = false,
  defaultOpen = true,
}: SessionWhiteboardsCardProps) {
  const [boards, setBoards] = useState<SessionBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [expanded, setExpanded] = useState(false);
  const [selectedBoard, setSelectedBoard] = useState<SessionBoard | null>(null);

  useEffect(() => {
    fetchBoards();
  }, [courseId]);

  const fetchBoards = async () => {
    try {
      setLoading(true);
      // Get all conferences for this course
      const confRes = await fetch(`/api/courses/${courseId}/conferences`);
      if (!confRes.ok) {
        setBoards([]);
        return;
      }

      const confData = await confRes.json();
      const conferences = confData.conferences || [];

      const allBoards: SessionBoard[] = [];

      // Fetch whiteboards for each ended conference
      for (const conf of conferences) {
        if (conf.status !== 'ended') continue;
        try {
          const wbRes = await fetch(`/api/conferences/${conf.id}/whiteboards`);
          if (wbRes.ok) {
            const wbData = await wbRes.json();
            for (const cw of (wbData.whiteboards || [])) {
              if (cw.whiteboard) {
                allBoards.push({
                  id: cw.id,
                  whiteboard: cw.whiteboard,
                  created_at: cw.created_at,
                });
              }
            }
          }
        } catch {
          // skip this conference
        }
      }

      setBoards(allBoards);
    } catch (error) {
      console.error('Error fetching session boards:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-7 h-7 bg-gray-200 rounded-lg" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
      </div>
    );
  }

  if (boards.length === 0) return null;

  const visibleBoards = expanded ? boards : boards.slice(0, maxVisible);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div
          className={`bg-gradient-to-r from-blue-50 to-indigo-50 px-4 sm:px-5 py-3 border-b border-gray-100 ${collapsible ? 'cursor-pointer select-none' : ''}`}
          onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <Layout className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                Session Whiteboards
              </h2>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {boards.length}
              </span>
            </div>
            {collapsible && (
              isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>

        {(!collapsible || isOpen) && (
          <div className="p-3 sm:p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {visibleBoards.map((board) => (
                <button
                  key={board.id}
                  onClick={() => setSelectedBoard(board)}
                  className="group bg-gray-50 rounded-lg border border-gray-200 overflow-hidden hover:border-blue-300 hover:shadow-sm transition-all text-left"
                >
                  <div className="h-20 bg-gray-100 flex items-center justify-center relative">
                    {board.whiteboard.thumbnail_url ? (
                      <img src={board.whiteboard.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Layout className="w-6 h-6 text-gray-300" />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <ExternalLink className="w-4 h-4 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-800 truncate">{board.whiteboard.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(board.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {boards.length > maxVisible && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                {expanded ? (
                  <><ChevronUp className="w-3 h-3" /> Show less</>
                ) : (
                  <><ChevronDown className="w-3 h-3" /> Show all {boards.length} boards</>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Board preview modal */}
      {selectedBoard && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">{selectedBoard.whiteboard.title}</h3>
              <button
                onClick={() => setSelectedBoard(null)}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden" style={{ height: '500px' }}>
              <WhiteboardViewer
                elements={selectedBoard.whiteboard.elements}
                appState={selectedBoard.whiteboard.app_state}
                title={selectedBoard.whiteboard.title}
                showHeader={false}
                height="100%"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
