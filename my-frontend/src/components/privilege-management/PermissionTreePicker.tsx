'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, Check, Minus } from 'lucide-react';

/**
 * Permission Tree Picker Component
 * 
 * Renders a hierarchical tree of modules → pages → actions with checkboxes.
 * Used for selecting permissions when creating or editing roles.
 * 
 * @example
 * <PermissionTreePicker
 *   modules={MASTER_MODULES}
 *   selected={selectedPermissionIds}
 *   onChange={setSelectedPermissionIds}
 * />
 */

// Types
export interface Action {
  id: string;
  name: string;
  description?: string;
}

export interface Page {
  id: string;
  name: string;
  description?: string;
  actions: Action[];
}

export interface Module {
  id: string;
  name: string;
  description?: string;
  icon?: React.ReactNode;
  pages: Page[];
}

export interface PermissionTreePickerProps {
  /** Array of modules containing pages and actions */
  modules: Module[];
  /** Currently selected permission IDs */
  selected: string[];
  /** Callback when selection changes */
  onChange: (ids: string[]) => void;
  /** Whether the picker is disabled */
  disabled?: boolean;
  /** Optional className for styling */
  className?: string;
  /** Show action descriptions */
  showDescriptions?: boolean;
  /** Feature flag check - only render if enabled */
  featureEnabled?: boolean;
}

// Helper to generate permission ID from module/page/action
export function generatePermissionId(moduleId: string, pageId: string, actionId: string): string {
  return `${moduleId}:${pageId}:${actionId}`;
}

// Helper to parse a permission ID
export function parsePermissionId(permissionId: string): { moduleId: string; pageId: string; actionId: string } | null {
  const parts = permissionId.split(':');
  if (parts.length !== 3) return null;
  return { moduleId: parts[0], pageId: parts[1], actionId: parts[2] };
}

// Checkbox component with indeterminate state
function Checkbox({ 
  checked, 
  indeterminate, 
  onChange, 
  disabled 
}: { 
  checked: boolean; 
  indeterminate?: boolean; 
  onChange: () => void; 
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`
        w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-500'}
        ${checked ? 'bg-blue-600 border-blue-600' : indeterminate ? 'bg-blue-400 border-blue-400' : 'bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600'}
      `}
      aria-checked={indeterminate ? 'mixed' : checked}
    >
      {checked && <Check className="w-3 h-3 text-white" />}
      {indeterminate && !checked && <Minus className="w-3 h-3 text-white" />}
    </button>
  );
}

// Tree node component for modules
function ModuleNode({
  module,
  selected,
  onToggle,
  disabled,
  showDescriptions
}: {
  module: Module;
  selected: string[];
  onToggle: (ids: string[], add: boolean) => void;
  disabled?: boolean;
  showDescriptions?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  // Get all permission IDs for this module
  const modulePermissionIds = useMemo(() => {
    const ids: string[] = [];
    module.pages.forEach(page => {
      page.actions.forEach(action => {
        ids.push(generatePermissionId(module.id, page.id, action.id));
      });
    });
    return ids;
  }, [module]);

  // Check if all, some, or none are selected
  const selectedCount = modulePermissionIds.filter(id => selected.includes(id)).length;
  const allSelected = selectedCount === modulePermissionIds.length && modulePermissionIds.length > 0;
  const someSelected = selectedCount > 0 && selectedCount < modulePermissionIds.length;

  const handleModuleToggle = () => {
    if (allSelected) {
      onToggle(modulePermissionIds, false);
    } else {
      onToggle(modulePermissionIds, true);
    }
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-2 overflow-hidden">
      {/* Module Header */}
      <div 
        className={`
          flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 
          ${!disabled ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750' : ''}
        `}
      >
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          disabled={disabled}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          )}
        </button>
        
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          onChange={handleModuleToggle}
          disabled={disabled}
        />
        
        {module.icon && <span className="text-gray-500">{module.icon}</span>}
        
        <div className="flex-1">
          <span className="font-medium text-gray-900 dark:text-gray-100">{module.name}</span>
          {showDescriptions && module.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{module.description}</p>
          )}
        </div>
        
        <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
          {selectedCount}/{modulePermissionIds.length}
        </span>
      </div>
      
      {/* Pages */}
      {expanded && (
        <div className="p-2 space-y-2">
          {module.pages.map(page => (
            <PageNode
              key={page.id}
              module={module}
              page={page}
              selected={selected}
              onToggle={onToggle}
              disabled={disabled}
              showDescriptions={showDescriptions}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Tree node component for pages
function PageNode({
  module,
  page,
  selected,
  onToggle,
  disabled,
  showDescriptions
}: {
  module: Module;
  page: Page;
  selected: string[];
  onToggle: (ids: string[], add: boolean) => void;
  disabled?: boolean;
  showDescriptions?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  // Get all permission IDs for this page
  const pagePermissionIds = useMemo(() => {
    return page.actions.map(action => 
      generatePermissionId(module.id, page.id, action.id)
    );
  }, [module.id, page]);

  // Check selection state
  const selectedCount = pagePermissionIds.filter(id => selected.includes(id)).length;
  const allSelected = selectedCount === pagePermissionIds.length && pagePermissionIds.length > 0;
  const someSelected = selectedCount > 0 && selectedCount < pagePermissionIds.length;

  const handlePageToggle = () => {
    if (allSelected) {
      onToggle(pagePermissionIds, false);
    } else {
      onToggle(pagePermissionIds, true);
    }
  };

  return (
    <div className="ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-3">
      {/* Page Header */}
      <div className="flex items-center gap-2 py-2">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
          disabled={disabled}
        >
          {expanded ? (
            <ChevronDown className="w-3 h-3 text-gray-400" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-400" />
          )}
        </button>
        
        <Checkbox
          checked={allSelected}
          indeterminate={someSelected}
          onChange={handlePageToggle}
          disabled={disabled}
        />
        
        <div className="flex-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{page.name}</span>
          {showDescriptions && page.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400">{page.description}</p>
          )}
        </div>
        
        <span className="text-xs text-gray-400">
          {selectedCount}/{pagePermissionIds.length}
        </span>
      </div>
      
      {/* Actions */}
      {expanded && (
        <div className="ml-6 py-1 space-y-1">
          {page.actions.map(action => {
            const permissionId = generatePermissionId(module.id, page.id, action.id);
            const isSelected = selected.includes(permissionId);
            
            return (
              <div key={action.id} className="flex items-center gap-2 py-1">
                <Checkbox
                  checked={isSelected}
                  onChange={() => onToggle([permissionId], !isSelected)}
                  disabled={disabled}
                />
                <div className="flex-1">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{action.name}</span>
                  {showDescriptions && action.description && (
                    <p className="text-xs text-gray-400">{action.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Main component
export default function PermissionTreePicker({
  modules,
  selected,
  onChange,
  disabled = false,
  className = '',
  showDescriptions = false,
  featureEnabled = true
}: PermissionTreePickerProps) {
  // Feature flag check
  if (!featureEnabled) {
    return null;
  }

  // Handle toggling permissions
  const handleToggle = useCallback((ids: string[], add: boolean) => {
    if (add) {
      const newSelected = [...new Set([...selected, ...ids])];
      onChange(newSelected);
    } else {
      const idsToRemove = new Set(ids);
      const newSelected = selected.filter(id => !idsToRemove.has(id));
      onChange(newSelected);
    }
  }, [selected, onChange]);

  // Count total available and selected
  const totalPermissions = useMemo(() => {
    let count = 0;
    modules.forEach(module => {
      module.pages.forEach(page => {
        count += page.actions.length;
      });
    });
    return count;
  }, [modules]);

  return (
    <div className={`permission-tree-picker ${className}`}>
      {/* Header with counts */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Select Permissions
        </span>
        <span className="text-sm text-gray-500">
          {selected.length} of {totalPermissions} selected
        </span>
      </div>
      
      {/* Quick actions */}
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => {
            const allIds: string[] = [];
            modules.forEach(module => {
              module.pages.forEach(page => {
                page.actions.forEach(action => {
                  allIds.push(generatePermissionId(module.id, page.id, action.id));
                });
              });
            });
            onChange(allIds);
          }}
          disabled={disabled}
          className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50 dark:bg-blue-900 dark:text-blue-300"
        >
          Select All
        </button>
        <button
          type="button"
          onClick={() => onChange([])}
          disabled={disabled}
          className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300"
        >
          Clear All
        </button>
      </div>
      
      {/* Module tree */}
      <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
        {modules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No modules available
          </div>
        ) : (
          modules.map(module => (
            <ModuleNode
              key={module.id}
              module={module}
              selected={selected}
              onToggle={handleToggle}
              disabled={disabled}
              showDescriptions={showDescriptions}
            />
          ))
        )}
      </div>
    </div>
  );
}
