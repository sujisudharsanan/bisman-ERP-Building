/**
 * User Avatar Component
 * Displays user avatar with initials fallback
 */

import React from 'react';

interface UserAvatarProps {
  name: string;
  email?: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-12 h-12 text-lg',
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getColorFromName = (name: string): string => {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];
  
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  email,
  imageUrl,
  size = 'md',
  className = '',
}) => {
  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  return (
    <div
      className={`
        ${sizeClasses[size]}
        rounded-full
        flex items-center justify-center
        font-medium text-white
        ${imageUrl ? '' : bgColor}
        ${className}
      `}
      title={email || name}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full rounded-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
};
