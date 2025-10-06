'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface RoleLayoutProps {
  children: React.ReactNode;
  currentUser: {
    name: string;
    email: string;
    role: string;
    photo?: string;
  };
  showBackButton?: boolean;
  backUrl?: string;
}

export default function RoleLayout({
  children,
  currentUser,
  showBackButton = false,
  backUrl = '/',
}: RoleLayoutProps) {
  const router = useRouter();

  const handleLogout = () => {
    // Clear any stored auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userData');

    // Redirect to login
    router.push('/auth/login');
  };

  const handleBack = () => {
    if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  const getRoleIcon = () => {
    switch (currentUser.role.toLowerCase()) {
      case 'super admin':
        return <span className="text-2xl">⚙️</span>;
      case 'admin':
        return <span className="text-2xl">👥</span>;
      case 'manager':
        return <span className="text-2xl">📊</span>;
      case 'hub incharge':
        return <span className="text-2xl">🔧</span>;
      default:
        return <span className="text-2xl">👤</span>;
    }
  };

  const getRoleColor = () => {
    switch (currentUser.role.toLowerCase()) {
      case 'super admin':
        return 'from-purple-600 to-purple-800';
      case 'admin':
        return 'from-blue-600 to-blue-800';
      case 'manager':
        return 'from-green-600 to-green-800';
      case 'hub incharge':
        return 'from-orange-600 to-orange-800';
      default:
        return 'from-gray-600 to-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className={`bg-gradient-to-r ${getRoleColor()} shadow-lg`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left side - Role info */}
            <div className="flex items-center space-x-4">
              {showBackButton && (
                <button
                  onClick={handleBack}
                  className="text-white hover:text-gray-200 transition-colors p-2 rounded-full hover:bg-white/10"
                  aria-label="Go back"
                >
                  <span className="text-xl">←</span>
                </button>
              )}

              <div className="flex items-center space-x-3">
                <div className="text-white">{getRoleIcon()}</div>
                <div>
                  <h1 className="text-xl font-bold text-white">
                    {currentUser.role} Dashboard
                  </h1>
                  <p className="text-white/80 text-sm">BISMAN ERP System</p>
                </div>
              </div>
            </div>

            {/* Right side - User info and logout */}
            <div className="flex items-center space-x-4">
              {/* User info */}
              <div className="hidden sm:flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-white font-medium text-sm">
                    {currentUser.name}
                  </p>
                  <p className="text-white/80 text-xs">{currentUser.email}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                  {currentUser.photo ? (
                    <img
                      src={currentUser.photo}
                      alt={`${currentUser.name} profile`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-lg">👤</span>
                  )}
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition-colors"
                aria-label="Logout"
              >
                <span className="text-lg">🚪</span>
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-600 text-sm">
              © 2024 BISMAN ERP. All rights reserved.
            </div>
            <div className="text-gray-500 text-sm mt-2 md:mt-0">
              {currentUser.role} Access Level • Version 1.0.0
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
