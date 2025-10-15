'use client';

import React from 'react';
import DashboardSidebar from './DashboardSidebar';
import TopNavbar from './TopNavbar';
import { HubInchargeBottomBar } from '@/components/hub-incharge/HubInchargeTabs';

interface DashboardLayoutProps {
  children: React.ReactNode;
  role: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, role }) => {
  return (
    <div className="bg-theme text-theme min-h-screen flex overflow-hidden theme-transition">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNavbar showThemeToggle />
        <main className="py-px flex-1 overflow-auto">
          {children}
        </main>
      </div>
      {/* Place bottom bar outside the scrollable main so it's not clipped */}
      <HubInchargeBottomBar />
    </div>
  );
};

export default DashboardLayout;
