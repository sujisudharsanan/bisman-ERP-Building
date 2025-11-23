"use client";
import React, { useState } from 'react';
import { Search, Settings } from 'lucide-react';
import { useTranslation } from 'next-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { usePresence, usePresenceStore, isOnline } from '@/hooks/usePresence';

interface Contact {
  id: number;
  name: string;
  avatar: string;
  lastMessage: string;
  online: boolean;
  unread: number;
  // Optional role for exclusion in searches
  role?: string;
}

interface ChatSidebarProps {
  contacts: Contact[];
  activeContact: number;
  onSelectContact: (id: number) => void;
  wide?: boolean;
  // When set to 'horizontal', renders a bottom dock style list
  orientation?: 'vertical' | 'horizontal';
  // Handler for settings button
  onOpenSettings?: () => void;
}

// Use next-i18next common namespace
// Keys: sidebar.search, sidebar.settings, sidebar.contacts

function normalizeRole(role?: string) {
  return (role || '')
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, ' ');
}

export default function ChatSidebar({ contacts, activeContact, onSelectContact, wide = false, orientation = 'vertical', onOpenSettings }: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation('common');
  const { user } = useAuth();
  usePresence();
  const presenceMap = usePresenceStore(s => s.map);

  // Current user normalized role
  const userRole = normalizeRole(user?.roleName || user?.role);

  // Format username for display
  const getDisplayName = () => {
    if (!user) return 'User';
    if (user.username) {
      return user.username
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    return 'User';
  };

  // RBAC: hide Super/Enterprise Admin for non-admins only
  const filteredContacts = contacts.filter(contact => {
    const contactRole = normalizeRole(contact.role);

    // Apply RBAC visibility
    const isSuper = userRole === 'super admin';
    const isEnterprise = userRole === 'enterprise admin';

    // For non-admins: exclude Super Admin and Enterprise Admin
    if (!isSuper && !isEnterprise) {
      if (contactRole === 'super admin' || contactRole === 'enterprise admin') return false;
    }
    // Admins can see everyone

    // Apply search query on name (case-insensitive)
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return contact.name.toLowerCase().includes(q);
  });

  // Horizontal (bottom dock) rendering
  if (orientation === 'horizontal') {
    return (
      <div className="flex-shrink-0 bg-gradient-to-b from-slate-700 to-slate-800 border-t border-slate-600">
        {/* Compact search row */}
        <div className="px-3 pt-2">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" aria-hidden />
            <input
              type="text"
              placeholder={t('sidebar.search')}
              aria-label={t('sidebar.search')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 bg-slate-600 text-white text-xs rounded-md placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
        {/* Horizontal contacts scroller */}
        <div className="h-24 overflow-x-auto overflow-y-hidden mt-2 px-2 pb-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700" role="list" aria-label="Contacts">
          <div className="flex items-stretch gap-2 min-w-max">
            {filteredContacts.map(contact => (
              <button
                key={contact.id}
                onClick={() => onSelectContact(contact.id)}
                className={`flex flex-col items-center justify-center w-28 flex-shrink-0 rounded-md p-2 transition-colors border ${
                  activeContact === contact.id ? 'bg-slate-600 border-blue-500' : 'bg-slate-700/60 border-transparent hover:bg-slate-700'
                }`}
                title={contact.name}
                aria-label={`Open chat with ${contact.name}`}
              >
                <div className="relative">
                  <img
                    src={contact.avatar}
                    alt={contact.name}
                    className="w-8 h-8 rounded-full object-cover"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`;
                    }}
                  />
                  {isOnline(contact.id, presenceMap) && (
                    <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full border border-slate-700" aria-hidden></div>
                  )}
                </div>
                <span className="mt-1 text-[11px] text-white truncate max-w-[6rem]">{contact.name}</span>
                {contact.unread > 0 && (
                  <span className="mt-0.5 px-1 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full min-w-[14px] text-center">
                    {contact.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default vertical rendering
  return (
    <div className={`${wide ? 'w-64 min-w-[16rem]' : 'w-[140px] min-w-[140px]'} h-full flex-shrink-0 bg-gradient-to-b from-slate-700 to-slate-800 flex flex-col`}>
      {/* User Profile */}
      <div className="p-3 border-b border-slate-600">
        <div className="flex items-center gap-2">
          <div className="relative">
            {user?.profile_pic_url ? (
              <img
                src={user.profile_pic_url.replace('/uploads/', '/api/secure-files/')}
                alt={getDisplayName()}
                className="w-9 h-9 rounded-full border-2 border-slate-500 object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-full border-2 border-slate-500 bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                {getDisplayName().charAt(0)}
              </div>
            )}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border border-slate-700" aria-hidden></div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{getDisplayName()}</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-slate-400" aria-hidden />
          <input
            type="text"
            placeholder={t('sidebar.search')}
            aria-label={t('sidebar.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 bg-slate-600 text-white text-xs rounded-md placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700" role="list" aria-label="Contacts">
        {filteredContacts.map(contact => (
          <div
            key={contact.id}
            onClick={() => onSelectContact(contact.id)}
            className={`p-2 cursor-pointer transition-all duration-200 border-l-2 ${
              activeContact === contact.id
                ? 'bg-slate-600 border-blue-500'
                : 'border-transparent hover:bg-slate-700'
            }`}
            title={`Open chat with ${contact.name}`}
            role="listitem"
            aria-label={`Contact ${contact.name}${contact.unread > 0 ? `, ${contact.unread} unread` : ''}`}
          >
            <div className="flex items-start gap-2">
              <div className="relative flex-shrink-0">
                <img
                  src={contact.avatar}
                  alt={contact.name}
                  className="w-8 h-8 rounded-full object-cover"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`;
                  }}
                />
                {isOnline(contact.id, presenceMap) && (
                  <div className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full border border-slate-700" aria-hidden></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-white text-xs font-medium truncate">{contact.name}</p>
                  {contact.unread > 0 && (
                    <span className="ml-1 px-1 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full min-w-[14px] text-center">
                      {contact.unread}
                    </span>
                  )}
                </div>
                <p className="text-slate-300 text-[10px] truncate mt-0.5">{contact.lastMessage}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Settings Button at very bottom */}
      <div className="p-2 border-t border-slate-600 mt-auto">
  <button onClick={onOpenSettings} className="w-full flex items-center gap-2 px-2 py-1.5 text-slate-300 hover:bg-slate-700 rounded-md transition-colors text-xs" aria-label={t('sidebar.settings')}>
          <Settings className="w-3 h-3" />
          <span>{t('sidebar.settings')}</span>
        </button>
      </div>
    </div>
  );
}
