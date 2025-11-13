'use client';

import React from 'react';
import { ChevronDown, Users, Loader2 } from 'lucide-react';
import type { RoleSelectorProps } from '@/types/privilege-management';

export function RoleSelector({ 
  roles, 
  selectedRole, 
  onRoleChange, 
  loading = false, 
  error = null 
}: RoleSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        <Users className="inline w-4 h-4 mr-1" />
        Select Role
      </label>
      
      <div className="relative">
        <select
          value={selectedRole || ''}
          onChange={(e) => onRoleChange(e.target.value || null)}
          disabled={loading}
          className={`
            w-full min-w-[200px] pl-4 pr-10 py-3 border rounded-lg
            bg-white text-gray-900 text-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error ? 'border-red-300 ring-red-100' : 'border-gray-300'}
            transition-colors duration-200
          `}
        >
          <option value="">Choose a role...</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name} {role.user_count !== undefined && `(${role.user_count} users)`}
            </option>
          ))}
        </select>
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {loading ? (
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>
      
      {error && (
        <p className="text-sm text-red-600 mt-1 flex items-center">
          <span className="mr-1">⚠️</span>
          {error}
        </p>
      )}
      
      {selectedRole && (
        <div className="text-xs text-gray-500 mt-1">
          {roles.find(r => r.id === selectedRole)?.description && (
            <p className="italic">
              {roles.find(r => r.id === selectedRole)?.description}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
