'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

type ProfileCardProps = {
  variant?: 'compact' | 'full';
  className?: string;
};

/**
 * Reusable Profile Card component
 * - compact: For top bar display (horizontal layout)
 * - full: For right panel display (card with more details)
 */
const ProfileCard: React.FC<ProfileCardProps> = ({ variant = 'compact', className = '' }) => {
  const { user } = useAuth();
  const router = useRouter();
  
  // Convert profile_pic_url to secure endpoint if needed
  const getProfilePicUrl = (url: string | undefined) => {
    if (!url) return null;
    if (url.startsWith('/api/')) return url;
    if (url.startsWith('/uploads/')) {
      return url.replace('/uploads/', '/api/secure-files/');
    }
    return url;
  };
  
  const profilePicUrl = getProfilePicUrl(user?.profile_pic_url);
  
  const displayName = user?.username 
    ? user.username.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : user?.email?.split('@')[0] || 'User';
    
  const roleName = user?.roleName?.replace(/_/g, ' ') || user?.role?.replace(/_/g, ' ') || 'User';
  
  const initials = (user?.name || user?.username || user?.email || 'U')[0].toUpperCase();

  if (variant === 'compact') {
    return (
      <div 
        className={`flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800/80 backdrop-blur-sm border border-gray-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/80 transition-colors ${className}`}
        onClick={() => router.push('/common/about-me')}
        title="View profile"
      >
        <div className="flex-1 min-w-0 text-right">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
            {displayName}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {roleName}
          </p>
        </div>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
          {profilePicUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={profilePicUrl} 
                alt="Profile" 
                className="w-full h-full object-cover absolute inset-0 z-10"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
              <span className="text-white font-bold text-sm">
                {initials}
              </span>
            </>
          ) : (
            <span className="text-white font-bold text-sm">
              {initials}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full variant for right panel
  return (
    <div 
      className={`flex items-center justify-between pr-0 flex-shrink-0 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/30 rounded-lg transition-colors p-1 ${className}`}
      onClick={() => router.push('/common/about-me')}
      title="View profile"
    >
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-theme truncate">
          {displayName}
        </h3>
        <p className="text-xs text-muted truncate">
          {roleName}
        </p>
      </div>
      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 ml-2 overflow-hidden relative">
        {profilePicUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={profilePicUrl} 
              alt="Profile" 
              className="w-full h-full object-cover absolute inset-0 z-10"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <span className="text-white font-bold text-sm sm:text-base">
              {initials}
            </span>
          </>
        ) : (
          <span className="text-white font-bold text-sm sm:text-base">
            {initials}
          </span>
        )}
      </div>
    </div>
  );
};

export default ProfileCard;
