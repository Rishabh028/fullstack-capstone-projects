'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import {
  Square,
  Circle,
  StickyNote,
  Type,
  MousePointer,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { UserSummary, CanvasElement } from '@/types';

interface CollaborativeCanvasProps {
  documentId: string;
  currentUser: UserSummary;
  isReadOnly?: boolean;
  onCollaboratorsChange?: (collaborators: any[]) => void;
  onDocChange?: (doc: Y.Doc) => void;
}

export const CollaborativeCanvas: React.FC<CollaborativeCanvasProps> = ({
  documentId,
  currentUser,
  isReadOnly = false,
  onCollaboratorsChange,
  onDocChange,
}) => {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [selectedTool, setSelectedTool] = useState<
    'select' | 'rectangle' | 'circle' | 'sticky' | 'text'
  >('select');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [remoteCursors, setRemoteCursors] = useState<
    Map<number, { x: number; y: number; user: { name: string; color: string } }>
  >(new Map());
  const [scale, setScale] = useState<number>(1);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const yElementsRef = useRef<Y.Array<CanvasElement> | null>(null);

  // Initialize Yjs and WebSocket connection
  useEffect(() => {
    const doc = new Y.Doc();
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:1234';
    const provider = new WebsocketProvider(wsUrl, `canvas-${documentId}`, doc);
    const yElements = doc.getArray<CanvasElement>('canvas-elements');

    ydocRef.current = doc;
    providerRef.current = provider;
    yElementsRef.current = yElements;

    if (onDocChange) onDocChange(doc);

    // Set initial awareness
    provider.awareness.setLocalStateField('user', {
      name: currentUser.name,
      color: currentUser.color || '#6366f1',
      avatar: currentUser.avatarUrl,
    });

    // Listen to changes in elements array
    const updateElements = () => {
      setElements(yElements.toArray());
    };
    yElements.observe(updateElements);
    updateElements();

    // Listen to remote cursors & presence
    const handleAwarenessChange = () => {
      const states = provider.awareness.getStates();
      const cursors = new Map<
        number,
        { x: number; y: number; user: { name: string; color: string } }
      >();
      const collabs: any[] = [];

      states.forEach((state, clientId) => {
        if (state.user) {
          collabs.push({ clientId, user: state.user });
          if (clientId !== provider.awareness.clientID && state.cursor) {
            cursors.set(clientId, {
              x: state.cursor.x,
              y: state.cursor.y,
              user: state.user,
            });
          }
        }
      });

      setRemoteCursors(cursors);
      if (onCollaboratorsChange) onCollaboratorsChange(collabs);
    };

    provider.awareness.on('change', handleAwarenessChange);

    return () => {
      yElements.unobserve(updateElements);
      provider.awareness.off('change', handleAwarenessChange);
      provider.destroy();
      doc.destroy();
    };
  }, [documentId, currentUser]);

  // Handle local cursor movement broadcast
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !providerRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / scale);
    const y = Math.round((e.clientY - rect.top) / scale);

    providerRef.current.awareness.setLocalStateField('cursor', { x, y });

    // Handle dragging element
    if (draggingId && yElementsRef.current && !isReadOnly) {
      const index = elements.findIndex((el) => el.id === draggingId);
      if (index !== -1) {
        const item = elements[index];
        const updatedItem = {
          ...item,
          x: x - dragOffset.x,
          y: y - dragOffset.y,
        };

        yElementsRef.current.doc?.transact(() => {
          yElementsRef.current?.delete(index, 1);
          yElementsRef.current?.insert(index, [updatedItem]);
        });
      }
    }
  };

  const handleMouseLeave = () => {
    if (providerRef.current) {
      providerRef.current.awareness.setLocalStateField('cursor', null);
    }
    setDraggingId(null);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isReadOnly || selectedTool === 'select' || !canvasRef.current || !yElementsRef.current) {
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / scale);
    const y = Math.round((e.clientY - rect.top) / scale);

    let newElement: CanvasElement | null = null;
    const newId = `el-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    switch (selectedTool) {
      case 'rectangle':
        newElement = {
          id: newId,
          type: 'rectangle',
          x: x - 75,
          y: y - 50,
          width: 150,
          height: 100,
          fill: '#e0e7ff',
          stroke: '#4f46e5',
          text: 'New Card',
        };
        break;
      case 'circle':
        newElement = {
          id: newId,
          type: 'circle',
          x: x - 60,
          y: y - 60,
          width: 120,
          height: 120,
          fill: '#dcfce7',
          stroke: '#10b981',
          text: 'Idea',
        };
        break;
      case 'sticky':
        newElement = {
          id: newId,
          type: 'sticky',
          x: x - 80,
          y: y - 80,
          width: 160,
          height: 160,
          fill: '#fef08a',
          stroke: '#ca8a04',
          text: 'Sticky Note: Edit me!',
        };
        break;
      case 'text':
        newElement = {
          id: newId,
          type: 'text',
          x: x - 50,
          y: y - 20,
          width: 200,
          height: 40,
          fill: 'transparent',
          stroke: 'transparent',
          text: 'Click to type text...',
        };
        break;
    }

    if (newElement) {
      yElementsRef.current.push([newElement]);
      setSelectedElementId(newId);
      setSelectedTool('select');
    }
  };

  const startDrag = (e: React.MouseEvent, el: CanvasElement) => {
    if (isReadOnly) return;
    e.stopPropagation();
    setSelectedElementId(el.id);
    setDraggingId(el.id);

    if (canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = Math.round((e.clientX - rect.left) / scale);
      const mouseY = Math.round((e.clientY - rect.top) / scale);
      setDragOffset({ x: mouseX - el.x, y: mouseY - el.y });
    }
  };

  const handleUpdateText = (id: string, text: string) => {
    if (isReadOnly || !yElementsRef.current) return;
    const index = elements.findIndex((el) => el.id === id);
    if (index !== -1) {
      const updated = { ...elements[index], text };
      yElementsRef.current.doc?.transact(() => {
        yElementsRef.current?.delete(index, 1);
        yElementsRef.current?.insert(index, [updated]);
      });
    }
  };

  const handleDeleteSelected = () => {
    if (isReadOnly || !selectedElementId || !yElementsRef.current) return;
    const index = elements.findIndex((el) => el.id === selectedElementId);
    if (index !== -1) {
      yElementsRef.current.delete(index, 1);
      setSelectedElementId(null);
    }
  };

  return (
    <div className="relative w-full h-[750px] bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col select-none">
      {/* Figma-Style Floating Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-lg">
        <button
          type="button"
          onClick={() => setSelectedTool('select')}
          className={`p-2 rounded-lg transition-colors ${
            selectedTool === 'select'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Select & Move (V)"
        >
          <MousePointer className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={isReadOnly}
          onClick={() => setSelectedTool('rectangle')}
          className={`p-2 rounded-lg transition-colors ${
            selectedTool === 'rectangle'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Rectangle (R)"
        >
          <Square className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={isReadOnly}
          onClick={() => setSelectedTool('circle')}
          className={`p-2 rounded-lg transition-colors ${
            selectedTool === 'circle'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Circle (O)"
        >
          <Circle className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={isReadOnly}
          onClick={() => setSelectedTool('sticky')}
          className={`p-2 rounded-lg transition-colors ${
            selectedTool === 'sticky'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Sticky Note (S)"
        >
          <StickyNote className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={isReadOnly}
          onClick={() => setSelectedTool('text')}
          className={`p-2 rounded-lg transition-colors ${
            selectedTool === 'text'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Text Card (T)"
        >
          <Type className="w-4 h-4" />
        </button>

        {selectedElementId && !isReadOnly && (
          <>
            <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-700 mx-1" />
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
              title="Delete Element (Del)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-md">
        <button
          type="button"
          onClick={() => setScale((s) => Math.max(0.4, s - 0.1))}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold px-2 text-slate-700 dark:text-slate-200">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={() => setScale((s) => Math.min(2.5, s + 0.1))}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setScale(1)}
          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
          title="Reset Zoom"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Main Interactive Canvas Area */}
      <div
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseUp={() => setDraggingId(null)}
        onClick={handleCanvasClick}
        className="w-full h-full relative overflow-hidden canvas-grid cursor-crosshair"
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: '0 0',
            width: '3000px',
            height: '3000px',
            position: 'absolute',
          }}
        >
          {/* Render Elements */}
          {elements.map((el) => {
            const isSelected = el.id === selectedElementId;

            return (
              <div
                key={el.id}
                onMouseDown={(e) => startDrag(e, el)}
                style={{
                  position: 'absolute',
                  left: `${el.x}px`,
                  top: `${el.y}px`,
                  width: `${el.width}px`,
                  height: `${el.height}px`,
                  backgroundColor: el.fill,
                  borderColor: el.stroke,
                }}
                className={`p-3 transition-shadow duration-100 cursor-move flex items-center justify-center text-center ${
                  el.type === 'circle' ? 'rounded-full' : 'rounded-lg'
                } ${
                  el.type === 'sticky'
                    ? 'shadow-md border-b-2 border-r-2 -rotate-1 hover:rotate-0'
                    : 'border-2 shadow-sm'
                } ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
              >
                <textarea
                  value={el.text || ''}
                  disabled={isReadOnly}
                  onChange={(e) => handleUpdateText(el.id, e.target.value)}
                  className="w-full h-full bg-transparent resize-none border-none outline-none font-medium text-slate-800 text-sm text-center flex items-center justify-center overflow-hidden"
                />
              </div>
            );
          })}

          {/* Render Remote Multiplayer Cursors (Figma-style) */}
          {Array.from(remoteCursors.entries()).map(([clientId, cursor]) => (
            <div
              key={clientId}
              className="absolute pointer-events-none z-50 transition-all duration-75 ease-out"
              style={{
                left: `${cursor.x}px`,
                top: `${cursor.y}px`,
              }}
            >
              {/* Cursor SVG Arrow */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                  fill={cursor.user.color || '#6366f1'}
                  stroke="white"
                  strokeWidth="1.5"
                />
              </svg>

              {/* Cursor User Tag */}
              <div
                className="ml-3 -mt-2 px-2 py-0.5 rounded text-[11px] font-bold text-white shadow-md whitespace-nowrap"
                style={{ backgroundColor: cursor.user.color || '#6366f1' }}
              >
                {cursor.user.name}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
