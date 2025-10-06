"use client"
import React, { useState, useEffect } from 'react'
import { Responsive, WidthProvider, Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

const ResponsiveGridLayout = WidthProvider(Responsive)

interface DashboardWidget {
  id: string
  title: string
  content: React.ReactNode
  defaultSize: { w: number; h: number; minW?: number; minH?: number }
}

interface GridDashboardProps {
  user: any
}

export default function GridDashboard({ user }: GridDashboardProps) {
  const [isEditMode, setIsEditMode] = useState(false)
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({})

  // Define dashboard widgets
  const widgets: DashboardWidget[] = [
    {
      id: 'api-requests',
      title: 'API Requests',
      defaultSize: { w: 4, h: 3, minW: 2, minH: 2 },
      content: (
        <div className="h-full flex flex-col">
          <div className="text-3xl font-bold text-blue-600 mb-2">1,234</div>
          <p className="text-gray-600 text-sm">Requests this hour</p>
          <div className="flex-1 flex items-end">
            <div className="w-full h-16 bg-blue-100 rounded flex items-end justify-center">
              <div className="text-xs text-blue-600">📈 Trending up</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'database-health',
      title: 'Database Health',
      defaultSize: { w: 4, h: 3, minW: 2, minH: 2 },
      content: (
        <div className="h-full flex flex-col">
          <div className="text-3xl font-bold text-green-600 mb-2">99.9%</div>
          <p className="text-gray-600 text-sm">Uptime</p>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'active-users',
      title: 'Active Users',
      defaultSize: { w: 4, h: 3, minW: 2, minH: 2 },
      content: (
        <div className="h-full flex flex-col">
          <div className="text-3xl font-bold text-purple-600 mb-2">56</div>
          <p className="text-gray-600 text-sm">Currently online</p>
          <div className="flex-1 flex items-end space-x-1">
            {[...Array(8)].map((_, i) => (
              <div 
                key={i} 
                className="bg-purple-200 rounded-t" 
                style={{ 
                  height: `${Math.random() * 60 + 20}%`, 
                  width: '10px' 
                }}
              />
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'response-time',
      title: 'Response Time',
      defaultSize: { w: 4, h: 3, minW: 2, minH: 2 },
      content: (
        <div className="h-full flex flex-col">
          <div className="text-3xl font-bold text-orange-600 mb-2">45ms</div>
          <p className="text-gray-600 text-sm">Average response</p>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-4xl">⚡</div>
          </div>
        </div>
      )
    },
    {
      id: 'error-rate',
      title: 'Error Rate',
      defaultSize: { w: 4, h: 3, minW: 2, minH: 2 },
      content: (
        <div className="h-full flex flex-col">
          <div className="text-3xl font-bold text-red-600 mb-2">0.1%</div>
          <p className="text-gray-600 text-sm">Last 24 hours</p>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-full h-2 bg-gray-200 rounded">
              <div className="w-1 h-2 bg-red-500 rounded"></div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'storage-usage',
      title: 'Storage Usage',
      defaultSize: { w: 4, h: 3, minW: 2, minH: 2 },
      content: (
        <div className="h-full flex flex-col">
          <div className="text-3xl font-bold text-indigo-600 mb-2">78%</div>
          <p className="text-gray-600 text-sm">Database storage</p>
          <div className="flex-1 flex items-center">
            <div className="w-full h-4 bg-gray-200 rounded">
              <div className="w-3/4 h-4 bg-indigo-500 rounded"></div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'recent-activity',
      title: 'Recent Activity',
      defaultSize: { w: 8, h: 4, minW: 4, minH: 3 },
      content: (
        <div className="h-full flex flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">User logged in - 2 minutes ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Database backup completed - 5 minutes ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">System maintenance scheduled - 10 minutes ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-600">New user registered - 15 minutes ago</span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'performance-metrics',
      title: 'Performance Metrics',
      defaultSize: { w: 6, h: 4, minW: 3, minH: 3 },
      content: (
        <div className="h-full flex flex-col">
          <div className="grid grid-cols-2 gap-4 flex-1">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">95%</div>
              <div className="text-xs text-gray-600">CPU Usage</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">2.1GB</div>
              <div className="text-xs text-gray-600">Memory</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">125MB/s</div>
              <div className="text-xs text-gray-600">Network</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">15.2K</div>
              <div className="text-xs text-gray-600">Requests/min</div>
            </div>
          </div>
        </div>
      )
    }
  ]

  // Default layouts for different screen sizes
  const defaultLayouts = {
    lg: [
      { i: 'api-requests', x: 0, y: 0, w: 4, h: 3 },
      { i: 'database-health', x: 4, y: 0, w: 4, h: 3 },
      { i: 'active-users', x: 8, y: 0, w: 4, h: 3 },
      { i: 'response-time', x: 0, y: 3, w: 4, h: 3 },
      { i: 'error-rate', x: 4, y: 3, w: 4, h: 3 },
      { i: 'storage-usage', x: 8, y: 3, w: 4, h: 3 },
      { i: 'recent-activity', x: 0, y: 6, w: 8, h: 4 },
      { i: 'performance-metrics', x: 8, y: 6, w: 4, h: 4 }
    ],
    md: [
      { i: 'api-requests', x: 0, y: 0, w: 6, h: 3 },
      { i: 'database-health', x: 6, y: 0, w: 6, h: 3 },
      { i: 'active-users', x: 0, y: 3, w: 6, h: 3 },
      { i: 'response-time', x: 6, y: 3, w: 6, h: 3 },
      { i: 'error-rate', x: 0, y: 6, w: 6, h: 3 },
      { i: 'storage-usage', x: 6, y: 6, w: 6, h: 3 },
      { i: 'recent-activity', x: 0, y: 9, w: 12, h: 4 },
      { i: 'performance-metrics', x: 0, y: 13, w: 12, h: 4 }
    ],
    sm: [
      { i: 'api-requests', x: 0, y: 0, w: 6, h: 3 },
      { i: 'database-health', x: 0, y: 3, w: 6, h: 3 },
      { i: 'active-users', x: 0, y: 6, w: 6, h: 3 },
      { i: 'response-time', x: 0, y: 9, w: 6, h: 3 },
      { i: 'error-rate', x: 0, y: 12, w: 6, h: 3 },
      { i: 'storage-usage', x: 0, y: 15, w: 6, h: 3 },
      { i: 'recent-activity', x: 0, y: 18, w: 6, h: 4 },
      { i: 'performance-metrics', x: 0, y: 22, w: 6, h: 4 }
    ]
  }

  useEffect(() => {
    // Load layouts from localStorage or use defaults
    const savedLayouts = localStorage.getItem('dashboard-layouts')
    if (savedLayouts) {
      setLayouts(JSON.parse(savedLayouts))
    } else {
      setLayouts(defaultLayouts)
    }
  }, [])

  const handleLayoutChange = (layout: Layout[], layouts: { [key: string]: Layout[] }) => {
    setLayouts(layouts)
    // Save to localStorage
    localStorage.setItem('dashboard-layouts', JSON.stringify(layouts))
  }

  const resetLayouts = () => {
    setLayouts(defaultLayouts)
    localStorage.setItem('dashboard-layouts', JSON.stringify(defaultLayouts))
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Grid Dashboard - {user?.roleName || 'User'}
          </h1>
          <p className="text-gray-600">Drag and resize widgets to customize your dashboard</p>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`px-4 py-2 rounded-md font-medium ${
              isEditMode 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {isEditMode ? '✓ Done Editing' : '✏️ Edit Layout'}
          </button>
          <button
            onClick={resetLayouts}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
          >
            🔄 Reset Layout
          </button>
        </div>
      </div>

      {/* Edit mode indicator */}
      {isEditMode && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded-md">
          <p className="text-blue-800 text-sm">
            <strong>Edit Mode:</strong> Drag widgets to move them, resize from the bottom-right corner
          </p>
        </div>
      )}

      {/* Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768 }}
        cols={{ lg: 12, md: 12, sm: 6 }}
        rowHeight={120}
        isDraggable={isEditMode}
        isResizable={isEditMode}
        compactType="vertical"
        preventCollision={false}
      >
        {widgets.map((widget) => (
          <div 
            key={widget.id} 
            className={`bg-white rounded-lg shadow-md p-4 flex flex-col h-full ${
              isEditMode ? 'border-2 border-dashed border-blue-300' : ''
            }`}
          >
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-800">{widget.title}</h3>
              {isEditMode && (
                <div className="text-blue-500 cursor-move">
                  <span className="text-xs">⋮⋮</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              {widget.content}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Custom CSS for grid layout */}
      <style jsx global>{`
        .react-grid-layout {
          position: relative;
        }
        
        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top;
        }
        
        .react-grid-item.cssTransforms {
          transition-property: transform;
        }
        
        .react-grid-item > div {
          height: 100%;
          width: 100%;
        }
        
        .react-grid-item > .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
          bottom: 0;
          right: 0;
          background: url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNiIgaGVpZ2h0PSI2IiB2aWV3Qm94PSIwIDAgNiA2IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8ZG90cyBmaWxsPSIjOTk5IiBvcGFjaXR5PSIwLjQiLz4KPHN2Zz4K') no-repeat bottom right;
          padding: 0 3px 3px 0;
          background-repeat: no-repeat;
          background-origin: content-box;
          box-sizing: border-box;
          cursor: se-resize;
        }
        
        .react-grid-item.react-grid-placeholder {
          background: #3b82f6;
          opacity: 0.2;
          transition-duration: 100ms;
          z-index: 2;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          -o-user-select: none;
          user-select: none;
        }
      `}</style>
    </div>
  )
}
