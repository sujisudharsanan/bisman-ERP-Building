/**
 * Custom hook to provide user data with proper typing
 * Extends AuthContext to include profilePhotoUrl and properly typed fields
 */

'use client';

import { useAuth } from '@/contexts/AuthContext';

export interface UserData {
  id?: number;
  username?: string;
  email?: string;
  name?: string;
  role?: string;
  roleName?: string;
  profilePhotoUrl?: string;
}

/**
 * Hook to get current user data following international standards
 * @returns User object with name, role, and profilePhotoUrl
 */
export const useUser = () => {
  const { user, loading } = useAuth();

  if (!user) {
    return {
      user: null,
      loading,
    };
  }

  // Transform user data to expected format
  const userData: UserData = {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.name || user.username || 'User',
    role: user.roleName || 'USER',
    roleName: user.roleName,
    profilePhotoUrl: undefined, // Will be fetched from API or profile settings
  };

  return {
    user: userData,
    loading,
  };
};
