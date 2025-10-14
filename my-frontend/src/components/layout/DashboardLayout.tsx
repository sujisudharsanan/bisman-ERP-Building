'use client';

import React from 'react';
import DashboardSidebar from './DashboardSidebar';
import TopNavbar from './TopNavbar';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, role }) => {
  return (
    <div className="bg-slate-900 text-white min-h-screen flex overflow-hidden">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNavbar />
  <main className="py-px flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
