/**
 * User Picker Component
 * Select users with search, avatars, and role filtering
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, User, Check } from 'lucide-react';
import { UserAvatar } from './UserAvatar';

export interface UserOption {
  id: number;
  username: string;
  email: string;
  roleName?: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

interface UserPickerProps {
  selectedUserId?: number;
  onUserSelect: (userId: number, user: UserOption) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  filterByRole?: string[];
  disabled?: boolean;
  error?: string;
}

export const UserPicker: React.FC<UserPickerProps> = ({
  selectedUserId,
  onUserSelect,
  placeholder = 'Select user...',
  label = 'Assign To',
  required = false,
  filterByRole,
  disabled = false,
  error,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch users from API
  useEffect(() => {
    fetchUsers();
  }, [filterByRole]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update selected user when prop changes
  useEffect(() => {
    if (selectedUserId && users.length > 0) {
      const user = users.find(u => u.id === selectedUserId);
      if (user) {
        setSelectedUser(user);
      }
    }
  }, [selectedUserId, users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        let userList = data.users || [];

        // Filter by role if specified
        if (filterByRole && filterByRole.length > 0) {
          userList = userList.filter((user: UserOption) => {
            const userRole = (user.roleName || user.role || '').toUpperCase();
            return filterByRole.some(role => userRole.includes(role.toUpperCase()));
          });
        }

        setUsers(userList);
      } else {
        console.error('Failed to fetch users');
        // Fallback to mock data for development
        setUsers(getMockUsers());
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      // Fallback to mock data
      setUsers(getMockUsers());
    } finally {
      setLoading(false);
    }
  };

  const getMockUsers = (): UserOption[] => {
    return [
      { id: 1, username: 'john_doe', email: 'john@example.com', roleName: 'MANAGER', firstName: 'John', lastName: 'Doe' },
      { id: 2, username: 'jane_smith', email: 'jane@example.com', roleName: 'STAFF', firstName: 'Jane', lastName: 'Smith' },
      { id: 3, username: 'bob_wilson', email: 'bob@example.com', roleName: 'ADMIN', firstName: 'Bob', lastName: 'Wilson' },
      { id: 4, username: 'alice_brown', email: 'alice@example.com', roleName: 'L1_APPROVER', firstName: 'Alice', lastName: 'Brown' },
      { id: 5, username: 'charlie_davis', email: 'charlie@example.com', roleName: 'L2_APPROVER', firstName: 'Charlie', lastName: 'Davis' },
    ];
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query) ||
      (user.firstName && user.firstName.toLowerCase().includes(query)) ||
      (user.lastName && user.lastName.toLowerCase().includes(query)) ||
      (user.roleName && user.roleName.toLowerCase().includes(query))
    );
  });

  const handleSelectUser = (user: UserOption) => {
    setSelectedUser(user);
    onUserSelect(user.id, user);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedUser(null);
    onUserSelect(0, {} as UserOption);
  };

  const getUserDisplayName = (user: UserOption): string => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user.username;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Selected User Display / Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-2.5 bg-white dark:bg-gray-700 border rounded-lg
          flex items-center justify-between gap-2 text-left
          transition-colors
          ${disabled 
            ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' 
            : 'hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
          }
          ${error 
            ? 'border-red-500 dark:border-red-400' 
            : 'border-gray-300 dark:border-gray-600'
          }
        `}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {selectedUser ? (
            <>
              <UserAvatar 
                name={getUserDisplayName(selectedUser)} 
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {getUserDisplayName(selectedUser)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {selectedUser.roleName || selectedUser.role || 'User'}
                </p>
              </div>
            </>
          ) : (
            <>
              <User className="w-5 h-5 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">{placeholder}</span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1">
          {selectedUser && !disabled && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-80 flex flex-col">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg
                         text-sm text-gray-900 dark:text-white placeholder-gray-500
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>
          </div>

          {/* User List */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading users...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center">
                <User className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {searchQuery ? 'No users found' : 'No users available'}
                </p>
              </div>
            ) : (
              <div className="py-2">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className={`
                      w-full px-4 py-3 flex items-center gap-3
                      hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                      ${selectedUser?.id === user.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''}
                    `}
                  >
                    <UserAvatar 
                      name={getUserDisplayName(user)} 
                      size="sm"
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {getUserDisplayName(user)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                      {user.roleName && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                          {user.roleName}
                        </p>
                      )}
                    </div>
                    {selectedUser?.id === user.id && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
