'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Table2, 
  Activity, 
  Search, 
  Settings, 
  ChevronRight,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Input from '@/components/ui/Input';
import PrimaryButton from '@/components/ui/Button';

interface SidebarProps {
  activeTable: string;
  onTableSelect: (table: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  tables?: string[];
}

interface TableSchema { name: string; icon: React.ReactNode; rowCount?: number; category: string }

// Sidebar now receives dynamic tables through props in future; placeholder logic stays for UX

export default function Sidebar({ activeTable, onTableSelect, isCollapsed, onToggleCollapse, tables = [] }: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Core', 'System']);

  // Build a simple categorized list from provided tables
  const all: TableSchema[] = (tables && tables.length
    ? tables.map((t) => ({ name: t, icon: <Table2 className="w-4 h-4" />, category: 'Public' }))
    : [
        { name: 'users', icon: <Table2 className="w-4 h-4" />, category: 'Public' },
        { name: 'roles', icon: <Settings className="w-4 h-4" />, category: 'Public' },
        { name: 'audit_logs', icon: <Activity className="w-4 h-4" />, category: 'Public' },
      ]
  );

  const filteredTables = all.filter((table: TableSchema) => table.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const categorizedTables = filteredTables.reduce((acc: Record<string, TableSchema[]>, table: TableSchema) => {
    if (!acc[table.category]) acc[table.category] = [];
    acc[table.category].push(table);
    return acc;
  }, {} as Record<string, TableSchema[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <>
      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onToggleCollapse}
        />
      )}

      {/* Sidebar */}
    <motion.div
        initial={false}
        animate={{ 
          x: isCollapsed ? -280 : 0,
          width: isCollapsed ? 0 : 280
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className={`
      fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-50 lg:relative lg:z-0
      ${isCollapsed ? 'w-0 overflow-hidden' : 'w-72'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo and Toggle */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <Database className="w-6 h-6 text-blue-600" />
              <span className="font-semibold text-gray-900">DB Browser</span>
            </div>
            <PrimaryButton
              variant="text"
              size="small"
              onClick={onToggleCollapse}
              className="lg:hidden"
            >
              <X className="w-4 h-4" />
            </PrimaryButton>
          </div>

          {/* Navigation */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Main Navigation */}
            <div className="p-4 space-y-2">
              <PrimaryButton
                variant="text"
                className="w-full justify-start"
                onClick={() => onTableSelect('dashboard')}
              >
                <Settings className="w-4 h-4 mr-2" />
                Superadmin Dashboard
              </PrimaryButton>
              
              <PrimaryButton
                variant={activeTable !== 'dashboard' && activeTable !== 'audit' ? 'contained' : 'text'}
                className="w-full justify-start"
              >
                <Database className="w-4 h-4 mr-2" />
                Database Browser
              </PrimaryButton>
              
              <PrimaryButton
                variant={activeTable === 'audit' ? 'contained' : 'text'}
                className="w-full justify-start"
                onClick={() => onTableSelect('audit_logs')}
              >
                <Activity className="w-4 h-4 mr-2" />
                Data Audit Log
              </PrimaryButton>
            </div>

            <div className="border-t border-gray-200 mx-4" />

            {/* Schema List */}
            <div className="flex-1 flex flex-col min-h-0 p-4">
              <div className="mb-3">
                <h3 className="text-sm font-medium text-gray-900 mb-2">SCHEMA LIST</h3>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search tables..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-8"
                  />
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-1">
                  {Object.entries(categorizedTables).map(([category, tables]) => (
                    <div key={category}>
                      <button
                        onClick={() => toggleCategory(category)}
                        className="flex items-center w-full text-left px-2 py-1 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                      >
                        {expandedCategories.includes(category) ? (
                          <ChevronDown className="w-3 h-3 mr-1" />
                        ) : (
                          <ChevronRight className="w-3 h-3 mr-1" />
                        )}
                        {category}
                      </button>
                      
                      {expandedCategories.includes(category) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="ml-4 space-y-1"
                        >
                          {tables && categorizedTables[category].map((table: TableSchema) => (
                            <button
                              key={table.name}
                              onClick={() => onTableSelect(table.name)}
                              className={`
                                flex items-center justify-between w-full text-left px-3 py-2 rounded-md text-sm transition-colors
                                ${activeTable === table.name
                                  ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-500'
                                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }
                              `}
                            >
                              <div className="flex items-center min-w-0">
                                {table.icon}
                                <span className="ml-2 truncate">{table.name}</span>
                              </div>
                              {typeof table.rowCount === 'number' && (
                                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                                  {table.rowCount.toLocaleString()}
                                </span>
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Mobile Toggle Button */}
      {isCollapsed && (
        <PrimaryButton
          variant="outlined"
          size="small"
          onClick={onToggleCollapse}
          className="fixed top-4 left-4 z-50 lg:hidden"
        >
          <Menu className="w-4 h-4" />
        </PrimaryButton>
      )}
    </>
  );
}
