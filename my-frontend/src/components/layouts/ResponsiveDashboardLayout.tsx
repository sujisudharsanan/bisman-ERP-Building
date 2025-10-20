'use client';

import { useRouter, usePathname } from 'next/navigation';
import DashboardBottomNav, { DashboardNavTab } from '@/components/navigation/DashboardBottomNav';
import DashboardTopTabs, { DashboardTopTab } from '@/components/navigation/DashboardTopTabs';

interface ResponsiveDashboardLayoutProps {
  children: React.ReactNode;
  tabs: (DashboardNavTab & DashboardTopTab)[];
  currentTab?: string;
  basePath?: string;
  onTabChange?: (tabId: string) => void; // Optional callback for tab changes
}

export default function ResponsiveDashboardLayout({ 
  children, 
  tabs,
  currentTab,
  basePath = '',
  onTabChange
}: ResponsiveDashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Determine active tab from pathname if not provided
  const getActiveTab = () => {
    if (currentTab) return currentTab;
    
    const matchedTab = tabs.find(tab => {
      const fullPath = basePath ? `${basePath}${tab.path}` : tab.path;
      return pathname === fullPath || pathname?.startsWith(fullPath);
    });
    return matchedTab?.id || tabs[0]?.id;
  };
  
  const activeTab = getActiveTab();
  
  const handleTabChange = (tabId: string) => {
    // If onTabChange callback is provided, use it instead of routing
    if (onTabChange) {
      onTabChange(tabId);
      return;
    }
    
    // Otherwise, use routing
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      const fullPath = basePath ? `${basePath}${tab.path}` : tab.path;
      router.push(fullPath);
    }
  };
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Fixed Top Tabs - Desktop Only */}
      <div className="fixed top-12 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <DashboardTopTabs 
          tabs={tabs} 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
        />
      </div>
      
      {/* Main Content with padding for fixed tabs */}
      <div className="flex-1 pb-safe lg:pt-10">
        {children}
      </div>
      
      {/* Bottom Nav - Mobile Only (Already fixed in component) */}
      <DashboardBottomNav 
        tabs={tabs} 
        activeTab={activeTab} 
        onTabChange={handleTabChange} 
      />
    </div>
  );
}
