'use client';

/**
 * Layout Registry Demo
 * Interactive demonstration of the layout registry system
 */

import React, { useState } from 'react';
import { usePageLayout } from '@/contexts/LayoutProvider';
import { ElementBounds } from '@/lib/layoutRegistry';
import LayoutDebugger from '@/components/LayoutDebugger';
import {
  Plus,
  Trash2,
  Grid3x3,
  Layers,
  AlertCircle,
  CheckCircle,
  Move,
  Maximize2,
} from 'lucide-react';

const WIDGET_TYPES = [
  { id: 'chart', label: 'Chart', color: 'bg-blue-500', width: 300, height: 200 },
  { id: 'table', label: 'Table', color: 'bg-green-500', width: 400, height: 250 },
  { id: 'stats', label: 'Stats', color: 'bg-purple-500', width: 200, height: 150 },
  { id: 'text', label: 'Text', color: 'bg-yellow-500', width: 250, height: 100 },
];

export default function LayoutRegistryDemo() {
  const pageId = 'demo-page';
  const {
    elements,
    registerElement,
    updateElement,
    removeElement,
    clearPage,
    updateSettings,
    validatePosition,
    getBoundingBox,
  } = usePageLayout(pageId);

  const [selectedType, setSelectedType] = useState(WIDGET_TYPES[0]);
  const [autoPosition, setAutoPosition] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const [draggedElement, setDraggedElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Update grid settings
  React.useEffect(() => {
    updateSettings({ snapToGrid, gridSize });
  }, [snapToGrid, gridSize, updateSettings]);

  const handleAddWidget = () => {
    const widget: ElementBounds = {
      id: `${selectedType.id}-${Date.now()}`,
      x: Math.random() * 200,
      y: Math.random() * 200,
      width: selectedType.width,
      height: selectedType.height,
      type: selectedType.id,
    };

    const positioned = registerElement(widget, autoPosition);
    console.log(
      `Added ${selectedType.label} at (${positioned.x}, ${positioned.y})`
    );
  };

  const handleAddMultiple = () => {
    const count = 5;
    for (let i = 0; i < count; i++) {
      const randomType = WIDGET_TYPES[Math.floor(Math.random() * WIDGET_TYPES.length)];
      const widget: ElementBounds = {
        id: `${randomType.id}-${Date.now()}-${i}`,
        x: Math.random() * 100,
        y: Math.random() * 100,
        width: randomType.width,
        height: randomType.height,
        type: randomType.id,
      };

      registerElement(widget, autoPosition);
    }
    console.log(`Added ${count} widgets`);
  };

  const handleMouseDown = (
    e: React.MouseEvent<HTMLDivElement>,
    elementId: string
  ) => {
    const element = elements.find((el) => el.id === elementId);
    if (!element) return;

    setDraggedElement(elementId);
    setDragOffset({
      x: e.clientX - element.x,
      y: e.clientY - element.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggedElement) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    updateElement(draggedElement, { x: newX, y: newY });
  };

  const handleMouseUp = () => {
    if (!draggedElement) return;

    const element = elements.find((el) => el.id === draggedElement);
    if (element) {
      // Validate final position
      const validation = validatePosition(element, { excludeId: draggedElement });

      if (!validation.valid) {
        console.warn(
          `Element ${draggedElement} overlaps with ${validation.overlaps.length} element(s)`
        );
      }
    }

    setDraggedElement(null);
  };

  const pageBounds = getBoundingBox();
  const overlappingCount = elements.filter((el) => {
    const validation = validatePosition(el, { excludeId: el.id });
    return !validation.valid;
  }).length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Layout Registry Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Interactive demonstration of automatic element positioning and overlap prevention
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Stats Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Statistics
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Total Elements:
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {elements.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Overlapping:
                  </span>
                  <span
                    className={`text-lg font-bold ${
                      overlappingCount > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-green-600 dark:text-green-400'
                    }`}
                  >
                    {overlappingCount}
                  </span>
                </div>
                {pageBounds && (
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Canvas Size:
                    </span>
                    <div className="text-xs font-mono text-gray-900 dark:text-gray-100 mt-1">
                      {Math.round(pageBounds.width)} × {Math.round(pageBounds.height)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Widget Type Selector */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Widget Type
              </h2>
              <div className="space-y-2">
                {WIDGET_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type)}
                    className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                      selectedType.id === type.id
                        ? 'bg-blue-100 dark:bg-blue-900/50 border-2 border-blue-500'
                        : 'bg-gray-100 dark:bg-gray-700 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded ${type.color}`} />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">
                          {type.label}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {type.width} × {type.height}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Settings
              </h2>
              <div className="space-y-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPosition}
                    onChange={(e) => setAutoPosition(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Auto-Position
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Prevent overlaps automatically
                    </div>
                  </div>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={snapToGrid}
                    onChange={(e) => setSnapToGrid(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Snap to Grid
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Align to {gridSize}px grid
                    </div>
                  </div>
                </label>

                {snapToGrid && (
                  <div>
                    <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Grid Size: {gridSize}px
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      step="10"
                      value={gridSize}
                      onChange={(e) => setGridSize(Number(e.target.value))}
                      className="w-full mt-2"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Actions
              </h2>
              <div className="space-y-2">
                <button
                  onClick={handleAddWidget}
                  className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Widget</span>
                </button>

                <button
                  onClick={handleAddMultiple}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 flex items-center justify-center space-x-2 transition-colors"
                >
                  <Layers className="w-5 h-5" />
                  <span>Add 5 Random</span>
                </button>

                <button
                  onClick={clearPage}
                  className="w-full bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 flex items-center justify-center space-x-2 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  <span>Clear All</span>
                </button>
              </div>
            </div>
          </div>

          {/* Canvas */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Canvas
                </h2>
                <div className="flex items-center space-x-2 text-sm">
                  {overlappingCount === 0 ? (
                    <div className="flex items-center space-x-1 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>No overlaps</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                      <AlertCircle className="w-4 h-4" />
                      <span>{overlappingCount} overlapping</span>
                    </div>
                  )}
                </div>
              </div>

              <div
                className="relative bg-gray-50 dark:bg-gray-900 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700"
                style={{ minHeight: '600px', overflow: 'hidden' }}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Grid overlay when enabled */}
                {snapToGrid && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `
                        linear-gradient(to right, rgba(156, 163, 175, 0.2) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(156, 163, 175, 0.2) 1px, transparent 1px)
                      `,
                      backgroundSize: `${gridSize}px ${gridSize}px`,
                    }}
                  />
                )}

                {/* Elements */}
                {elements.map((element) => {
                  const type = WIDGET_TYPES.find((t) => t.id === element.type);
                  const validation = validatePosition(element, {
                    excludeId: element.id,
                  });
                  const isOverlapping = !validation.valid;

                  return (
                    <div
                      key={element.id}
                      className={`absolute cursor-move transition-shadow ${
                        type?.color || 'bg-gray-500'
                      } ${
                        isOverlapping
                          ? 'ring-4 ring-red-500 ring-opacity-50'
                          : 'hover:shadow-lg'
                      } rounded-lg text-white shadow-md`}
                      style={{
                        left: `${element.x}px`,
                        top: `${element.y}px`,
                        width: `${element.width}px`,
                        height: `${element.height}px`,
                        opacity: draggedElement === element.id ? 0.7 : 1,
                      }}
                      onMouseDown={(e) => handleMouseDown(e, element.id)}
                    >
                      <div className="h-full p-4 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Move className="w-4 h-4" />
                            <span className="font-semibold text-sm">
                              {type?.label || 'Widget'}
                            </span>
                          </div>
                          <button
                            onClick={() => removeElement(element.id)}
                            className="hover:bg-white/20 p-1 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="text-xs opacity-75 font-mono">
                          {element.id.slice(0, 12)}...
                        </div>
                        <div className="text-xs opacity-75 mt-1">
                          ({Math.round(element.x)}, {Math.round(element.y)})
                        </div>
                        {isOverlapping && (
                          <div className="mt-auto pt-2 border-t border-white/20">
                            <div className="flex items-center space-x-1 text-xs">
                              <AlertCircle className="w-3 h-3" />
                              <span>Overlapping</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Empty state */}
                {elements.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-gray-400 dark:text-gray-600">
                      <Maximize2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-medium">Canvas is empty</p>
                      <p className="text-sm mt-1">
                        Add widgets using the controls on the left
                      </p>
                      <p className="text-xs mt-2 opacity-75">
                        Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded">Ctrl+Shift+L</kbd> for debug mode
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Layout Debugger */}
      <LayoutDebugger pageId={pageId} />
    </div>
  );
}
