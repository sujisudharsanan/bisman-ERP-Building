'use client';

/**
 * Layout Debugger Component
 * Visual overlay showing all registered element boundaries
 * with occupied areas highlighted
 */

import React, { useState, useEffect } from 'react';
import { useLayout } from '@/contexts/LayoutProvider';
import { ElementBounds } from '@/lib/layoutRegistry';
import { Eye, EyeOff, Grid3x3, Maximize2, Minimize2, RefreshCw } from 'lucide-react';

interface LayoutDebuggerProps {
  pageId: string;
  containerRef?: React.RefObject<HTMLElement>;
}

export default function LayoutDebugger({ pageId, containerRef }: LayoutDebuggerProps) {
  const layout = useLayout();
  const [visible, setVisible] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [highlightOverlaps, setHighlightOverlaps] = useState(true);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  // Keyboard shortcut to toggle debugger
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Shift + L to toggle
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        setVisible((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const elements = layout.getElements(pageId);
  const pageBounds = layout.getPageBoundingBox(pageId);

  // Calculate overlaps
  const getElementOverlaps = (element: ElementBounds): ElementBounds[] => {
    const validation = layout.validatePosition(pageId, element, {
      excludeId: element.id,
    });
    return validation.overlaps;
  };

  if (!visible) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="fixed bottom-4 right-4 z-50 bg-purple-600 text-white p-3 rounded-full shadow-lg hover:bg-purple-700 transition-colors"
        title="Show Layout Debugger (Ctrl+Shift+L)"
      >
        <Eye className="w-5 h-5" />
      </button>
    );
  }

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 pointer-events-none z-40">
        {/* Grid */}
        {showGrid && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(156, 163, 175, 0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(156, 163, 175, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
          />
        )}

        {/* Element boundaries */}
        {elements.map((element) => {
          const overlaps = highlightOverlaps ? getElementOverlaps(element) : [];
          const hasOverlap = overlaps.length > 0;
          const isSelected = selectedElement === element.id;

          return (
            <div
              key={element.id}
              className={`absolute border-2 pointer-events-auto cursor-pointer transition-all ${
                isSelected
                  ? 'border-blue-500 bg-blue-500/20 shadow-lg z-50'
                  : hasOverlap
                  ? 'border-red-500 bg-red-500/10'
                  : 'border-green-500 bg-green-500/5'
              } ${isSelected ? 'scale-105' : 'hover:scale-102'}`}
              style={{
                left: `${element.x}px`,
                top: `${element.y}px`,
                width: `${element.width}px`,
                height: `${element.height}px`,
              }}
              onClick={() => setSelectedElement(isSelected ? null : element.id)}
              title={`ID: ${element.id}\nPosition: (${element.x}, ${element.y})\nSize: ${element.width}x${element.height}${
                hasOverlap ? `\n⚠️ Overlaps with ${overlaps.length} element(s)` : ''
              }`}
            >
              {/* Element label */}
              <div
                className={`absolute -top-6 left-0 px-2 py-0.5 text-xs font-mono rounded whitespace-nowrap ${
                  isSelected
                    ? 'bg-blue-600 text-white'
                    : hasOverlap
                    ? 'bg-red-600 text-white'
                    : 'bg-green-600 text-white'
                }`}
              >
                {element.type || 'Element'} #{element.id.slice(0, 6)}
                {hasOverlap && ' ⚠️'}
              </div>

              {/* Dimensions display */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-black/70 text-white px-2 py-1 rounded text-xs font-mono">
                  {element.width} × {element.height}
                </div>
              </div>

              {/* Resize handles */}
              {isSelected && (
                <>
                  <div className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                  <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 rounded-full" />
                  <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 rounded-full" />
                </>
              )}
            </div>
          );
        })}

        {/* Page bounds indicator */}
        {pageBounds && (
          <div
            className="absolute border-2 border-dashed border-purple-500 bg-purple-500/5 pointer-events-none"
            style={{
              left: `${pageBounds.minX}px`,
              top: `${pageBounds.minY}px`,
              width: `${pageBounds.width}px`,
              height: `${pageBounds.height}px`,
            }}
          >
            <div className="absolute -top-6 left-0 px-2 py-0.5 bg-purple-600 text-white text-xs font-mono rounded whitespace-nowrap">
              Page Bounds: {pageBounds.width} × {pageBounds.height}
            </div>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-4 min-w-[320px] max-w-[400px]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-purple-500 rounded-full animate-pulse" />
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Layout Debugger
            </h3>
          </div>
          <button
            onClick={() => setVisible(false)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Hide Debugger (Ctrl+Shift+L)"
          >
            <EyeOff className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Page ID:</span>
            <span className="font-mono text-gray-900 dark:text-gray-100">{pageId}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Total Elements:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">
              {elements.length}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Overlapping:</span>
            <span className="font-semibold text-red-600 dark:text-red-400">
              {
                elements.filter((e) => getElementOverlaps(e).length > 0).length
              }
            </span>
          </div>
          {pageBounds && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Page Size:</span>
              <span className="font-mono text-gray-900 dark:text-gray-100">
                {pageBounds.width} × {pageBounds.height}
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-2">
          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <Grid3x3 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">Show Grid</span>
          </label>

          <label className="flex items-center space-x-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={highlightOverlaps}
              onChange={(e) => setHighlightOverlaps(e.target.checked)}
              className="rounded text-purple-600 focus:ring-purple-500"
            />
            <span className="text-gray-700 dark:text-gray-300">
              Highlight Overlaps
            </span>
          </label>
        </div>

        {/* Selected Element Info */}
        {selectedElement && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Selected Element
            </div>
            {(() => {
              const element = elements.find((e) => e.id === selectedElement);
              if (!element) return null;

              const overlaps = getElementOverlaps(element);

              return (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-300">ID:</span>
                    <span className="font-mono text-blue-900 dark:text-blue-100">
                      {element.id}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-300">Position:</span>
                    <span className="font-mono text-blue-900 dark:text-blue-100">
                      ({element.x}, {element.y})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700 dark:text-blue-300">Size:</span>
                    <span className="font-mono text-blue-900 dark:text-blue-100">
                      {element.width} × {element.height}
                    </span>
                  </div>
                  {element.type && (
                    <div className="flex justify-between">
                      <span className="text-blue-700 dark:text-blue-300">Type:</span>
                      <span className="font-mono text-blue-900 dark:text-blue-100">
                        {element.type}
                      </span>
                    </div>
                  )}
                  {overlaps.length > 0 && (
                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded">
                      <span className="text-red-700 dark:text-red-300 font-semibold">
                        ⚠️ Overlaps with {overlaps.length} element(s)
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex space-x-2">
          <button
            onClick={() => layout.clearPage(pageId)}
            className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center justify-center space-x-1"
            title="Clear all elements from this page"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Clear Page</span>
          </button>
        </div>

        {/* Keyboard Hint */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
          Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded font-mono">Ctrl+Shift+L</kbd> to toggle
        </div>
      </div>
    </>
  );
}
