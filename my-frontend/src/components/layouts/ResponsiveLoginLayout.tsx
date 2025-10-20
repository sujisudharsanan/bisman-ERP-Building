'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import BottomNav, { BottomNavTab } from '@/components/navigation/BottomNav';
import TopTabs, { TopTabsTab } from '@/components/navigation/TopTabs';
import { 
  User, 
  Shield, 
  Building, 
  Users,
  Briefcase,
  UserCircle
} from 'lucide-react';

// Define login types with their tabs
export const loginTabs: (BottomNavTab & TopTabsTab)[] = [
  {
    id: 'standard',
    label: 'Standard',
    icon: User,
    path: '/auth/login',
    description: 'General user login'
  },
  {
    id: 'admin',
    label: 'Admin',
    icon: Shield,
    path: '/auth/admin-login',
    description: 'Administrator access'
  },
  {
    id: 'super-admin',
    label: 'Super Admin',
    icon: UserCircle,
    path: '/auth/super-admin-login',
    description: 'System administrator'
  },
  {
    id: 'hub',
    label: 'Hub',
    icon: Building,
    path: '/auth/hub-incharge-login',
    description: 'Hub in-charge'
  },
  {
    id: 'manager',
    label: 'Manager',
    icon: Briefcase,
    path: '/auth/manager-login',
    description: 'Manager portal'
  },
  {
    id: 'staff',
    label: 'Staff',
    icon: Users,
    path: '/auth/staff-login',
    description: 'Staff members'
  }
];

interface ResponsiveLoginLayoutProps {
  children: React.ReactNode;
  currentTab?: string;
}

export default function ResponsiveLoginLayout({ 
  children, 
  currentTab 
}: ResponsiveLoginLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Determine active tab from pathname if not provided
  const getActiveTab = () => {
    if (currentTab) return currentTab;
    
    const matchedTab = loginTabs.find(tab => pathname === tab.path);
    return matchedTab?.id || 'standard';
  };
  
  const activeTab = getActiveTab();
  
  const handleTabChange = (tabId: string) => {
    const tab = loginTabs.find(t => t.id === tabId);
    if (tab) {
      router.push(tab.path);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950">
      {/* Top Tabs - Desktop Only */}
      <div className="hidden lg:block pt-8 px-4">
        <div className="max-w-6xl mx-auto">
          <TopTabs 
            tabs={loginTabs} 
            activeTab={activeTab} 
            onTabChange={handleTabChange} 
          />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="pb-safe">
        {children}
      </div>
      
      {/* Bottom Nav - Mobile Only */}
      <BottomNav 
        tabs={loginTabs} 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />
    </div>
  );
}
