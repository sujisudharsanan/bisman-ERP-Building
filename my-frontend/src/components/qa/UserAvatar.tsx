'use client';

import React from 'react';

interface UserAvatarProps {
  userId?: number | string | null;
  name?: string;
  imageUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  className?: string;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-xs',
  sm: 'w-8 h-8 text-sm',
  md: 'w-10 h-10 text-base',
  lg: 'w-12 h-12 text-lg',
  xl: 'w-16 h-16 text-xl',
};

const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const getColorFromId = (id: number | string | null | undefined): string => {
  const colors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-orange-500',
    'bg-pink-500',
    'bg-teal-500',
    'bg-indigo-500',
    'bg-cyan-500',
  ];
  if (!id) return colors[0];
  const numId = typeof id === 'string' ? parseInt(id, 10) || 0 : id;
  return colors[numId % colors.length];
};

export function UserAvatar({ 
  userId, 
  name = 'Unknown User', 
  imageUrl, 
  size = 'md', 
  showName = false,
  className = '' 
}: UserAvatarProps) {
  const initials = getInitials(name);
  const bgColor = getColorFromId(userId);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white dark:ring-gray-800`}
        />
      ) : (
        <div
          className={`
            ${sizeClasses[size]} ${bgColor}
            rounded-full flex items-center justify-center
            text-white font-semibold
            ring-2 ring-white dark:ring-gray-800
          `}
        >
          {initials}
        </div>
      )}
      {showName && (
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[150px]">
          {name}
        </span>
      )}
    </div>
  );
}

export default UserAvatar;
