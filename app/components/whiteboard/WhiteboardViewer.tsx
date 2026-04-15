'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Maximize2, Minimize2, Clock, User } from 'lucide-react';
import LoadingIndicator from '../ui/LoadingIndicator';

const Excalidraw = dynamic(
  () => import('@excalidraw/excalidraw').then((mod) => mod.Excalidraw),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full bg-gray-50"><div className="flex items-center gap-1.5">{[0,1,2,3].map(i=><div key={i} className="w-2 h-2 rounded-full" style={{background:['#6366f1','#8b5cf6','#3b82f6','#06b6d4'][i],animation:`wbDot 1.4s ease-in-out ${i*0.16}s infinite`}}/> )}<style>{`@keyframes wbDot{0%,80%,100%{transform:translateY(0)}40%{transform:translateY(-8px)}}`}</style></div></div> }
);

interface WhiteboardViewerProps {
  whiteboardId?: string;
  elements?: any[];
  appState?: Record<string, any>;
  title?: string;
  showHeader?: boolean;
  className?: string;
  height?: string;
}

export default function WhiteboardViewer({
  whiteboardId,
  elements: propElements,
  appState: propAppState,
  title: propTitle,
  showHeader = true,
  className = '',
  height = '400px',
}: WhiteboardViewerProps) {
  const [elements, setElements] = useState(propElements || []);
  const [appState, setAppState] = useState(propAppState || {});
  const [title, setTitle] = useState(propTitle || 'Board');
  const [loading, setLoading] = useState(!propElements && !!whiteboardId);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (whiteboardId && !propElements) {
      loadWhiteboard();
    }
  }, [whiteboardId]);

  const loadWhiteboard = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/whiteboards/${whiteboardId}`);
      if (res.ok) {
        const data = await res.json();
        setElements(data.elements || []);
        setAppState(data.app_state || {});
        setTitle(data.title || 'Board');
      } else {
        setError('Failed to load whiteboard');
      }
    } catch (err) {
      setError('Failed to load whiteboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 rounded-lg ${className}`} style={{ height }}>
        <LoadingIndicator variant="dots" size="sm" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 rounded-lg text-gray-500 text-sm ${className}`} style={{ height }}>
        {error}
      </div>
    );
  }

  if (elements.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 rounded-lg text-gray-400 text-sm ${className}`} style={{ height }}>
        This board is empty
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      } ${className}`}
      style={isFullscreen ? undefined : { height }}
    >
      {showHeader && (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
          <span className="text-sm font-medium text-gray-700 truncate">{title}</span>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      )}
      <div className={isFullscreen ? 'h-[calc(100%-40px)]' : 'h-[calc(100%-40px)]'}>
        <Excalidraw
          initialData={{
            elements,
            appState: {
              viewBackgroundColor: '#ffffff',
              ...appState,
            },
          }}
          viewModeEnabled={true}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              saveToActiveFile: false,
              clearCanvas: false,
            },
          }}
        />
      </div>
    </div>
  );
}
