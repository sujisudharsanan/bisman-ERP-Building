'use client';

import React from 'react';
import { ChevronDown, User, Loader2, AlertCircle } from 'lucide-react';
import type { UserSelectorProps } from '@/types/privilege-management';

export function UserSelector({ 
  users, 
  selectedUser, 
  onUserChange, 
  loading = false, 
  error = null,
  disabled = false
}: UserSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        <User className="inline w-4 h-4 mr-1" />
        Select User (Optional)
        <span className="text-xs text-gray-500 ml-1">- Override role privileges</span>
      </label>
      
      <div className="relative">
        <select
          value={selectedUser || ''}
          onChange={(e) => onUserChange(e.target.value || null)}
          disabled={loading || disabled}
          className={`
            w-full min-w-[200px] pl-4 pr-10 py-3 border rounded-lg
            bg-white text-gray-900 text-sm
            focus:ring-2 focus:ring-blue-500 focus:border-blue-500
            disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed
            ${error ? 'border-red-300 ring-red-100' : 'border-gray-300'}
            transition-colors duration-200
          `}
        >
          <option value="">Show role defaults</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.first_name} {user.last_name} ({user.email})
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
          <AlertCircle className="w-3 h-3 mr-1" />
          {error}
        </p>
      )}
      
      {disabled && (
        <p className="text-xs text-gray-500 mt-1 flex items-center">
          <AlertCircle className="w-3 h-3 mr-1" />
          Please select a role first to see its users
        </p>
      )}
      
      {selectedUser && users.length > 0 && (
        <div className="text-xs text-gray-600 mt-1 p-2 bg-blue-50 rounded border border-blue-200">
          <p className="font-medium">User Override Mode</p>
          <p>Changes will only affect this specific user, not the entire role.</p>
        </div>
      )}
      
      {!selectedUser && users.length > 0 && (
        <div className="text-xs text-gray-600 mt-1">
          <p>Showing role default privileges for <strong>{users.length}</strong> users</p>
        </div>
      )}
    </div>
  );
}
