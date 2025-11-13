"use client";

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAuth } from '@/common/hooks/useAuth';
import {
  Home,
  User,
  CheckCircle,
  ShoppingCart,
  DollarSign,
  BarChart3,
  MessageCircle,
  Settings,
  ClipboardList,
  PlusCircle,
} from 'lucide-react';

type TabName =
  | 'Dashboard'
  | 'About Me'
  | 'Approvals'
  | 'Purchase'
  | 'Expenses'
  | 'Performance'
  | 'Messages'
  | 'Create Task'
  | 'Tasks & Requests'
  | 'Settings';

// Map tab names to their page keys in the permission system
const TAB_TO_PAGE_KEY: Record<TabName, string> = {
  'Dashboard': 'hub-incharge-dashboard',
  'About Me': 'about-me',
  'Approvals': 'hub-incharge-approvals',
  'Purchase': 'hub-incharge-purchase',
  'Expenses': 'hub-incharge-expenses',
  'Performance': 'hub-incharge-performance',
  'Messages': 'hub-incharge-messages',
  'Create Task': 'hub-incharge-create-task',
  'Tasks & Requests': 'hub-incharge-tasks-requests',
  'Settings': 'hub-incharge-settings',
};

export default function HubInchargeTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, hasAccess } = useAuth();
  const [userAllowedPages, setUserAllowedPages] = React.useState<string[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = React.useState(true);
  
  const initialTab = (searchParams?.get('tab') as TabName) || 'Dashboard';
  const [activeTab, setActiveTab] = React.useState<TabName>(initialTab);

  // Fetch user permissions from database
  React.useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!user?.id) {
        setIsLoadingPermissions(false);
        return;
      }

      try {
        const response = await fetch(`/api/permissions?userId=${user.id}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          const allowedPages = result.data?.allowedPages || result.allowedPages || [];
          setUserAllowedPages(allowedPages);
        }
      } catch (error) {
        console.error('[HubInchargeTabs] Error fetching permissions:', error);
      } finally {
        setIsLoadingPermissions(false);
      }
    };

    fetchUserPermissions();
  }, [user?.id]);

  React.useEffect(() => {
    setActiveTab(initialTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.toString()]);

  // All available tabs with their page keys
  const allNavItems: { name: TabName; icon: JSX.Element; pageKey: string }[] = [
    { name: 'Dashboard', icon: <Home size={16} />, pageKey: TAB_TO_PAGE_KEY['Dashboard'] },
    { name: 'About Me', icon: <User size={16} />, pageKey: TAB_TO_PAGE_KEY['About Me'] },
    { name: 'Approvals', icon: <CheckCircle size={16} />, pageKey: TAB_TO_PAGE_KEY['Approvals'] },
    { name: 'Purchase', icon: <ShoppingCart size={16} />, pageKey: TAB_TO_PAGE_KEY['Purchase'] },
    { name: 'Expenses', icon: <DollarSign size={16} />, pageKey: TAB_TO_PAGE_KEY['Expenses'] },
    { name: 'Performance', icon: <BarChart3 size={16} />, pageKey: TAB_TO_PAGE_KEY['Performance'] },
    { name: 'Messages', icon: <MessageCircle size={16} />, pageKey: TAB_TO_PAGE_KEY['Messages'] },
    { name: 'Create Task', icon: <PlusCircle size={16} />, pageKey: TAB_TO_PAGE_KEY['Create Task'] },
    { name: 'Tasks & Requests', icon: <ClipboardList size={16} />, pageKey: TAB_TO_PAGE_KEY['Tasks & Requests'] },
    { name: 'Settings', icon: <Settings size={16} />, pageKey: TAB_TO_PAGE_KEY['Settings'] },
  ];

  // Filter tabs based on user permissions
  const navItems = React.useMemo(() => {
    if (isLoadingPermissions) return allNavItems; // Show all while loading
    
    return allNavItems.filter(item => {
      // Check if user has permission for this page
      return userAllowedPages.includes(item.pageKey);
    });
  }, [isLoadingPermissions, userAllowedPages]);

  const handleTabChange = (tabName: TabName) => {
    setActiveTab(tabName);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabName);
      router.replace(url.pathname + url.search);
  // ensure browser URL is updated (also use history API to trigger search param change)
  try { window.history.replaceState(null, '', url.pathname + url.search); } catch {};
  // notify embedded hub app
  window.dispatchEvent(new CustomEvent('hub-tab-change', { detail: tabName }));
    } catch {
      // fallback: push to same path with search param
      router.replace(`?tab=${encodeURIComponent(tabName)}`);
  try { window.history.replaceState(null, '', `?tab=${encodeURIComponent(tabName)}`); } catch {};
  window.dispatchEvent(new CustomEvent('hub-tab-change', { detail: tabName }));
    }
  };

  return (
    <div>
      <nav className="bg-transparent hidden md:block">
        <div className="flex justify-around py-2 overflow-x-auto">
          {navItems.map(tab => (
            <button
              key={tab.name}
              onClick={() => handleTabChange(tab.name)}
              className={`flex flex-col items-center text-xs px-2 py-1 min-w-max ${
                activeTab === tab.name
                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                  : 'text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.icon}
              <span className="mt-1 text-[10px] sm:text-xs">{tab.name}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Embedded HubInchargeApp content (header/nav hidden) */}
      <div className="hub-incharge-embed mt-3">
        <EmbeddedHubIncharge />
      </div>
      <style>{`.hub-incharge-embed header, .hub-incharge-embed nav { display:none !important; } .hub-incharge-embed main { padding: 0 !important; }`}</style>
    </div>
  );
}

const EmbeddedHubIncharge = dynamic(
  // load the full HubInchargeApp but render only its main content (we hide its header/nav)
  () => import('@/components/hub-incharge/HubInchargeApp').then(mod => mod.default),
  { ssr: false, loading: () => <div className="py-6 text-sm text-muted">Loading hub content...</div> }
);

// Static bottom bar to mimic Excel-like sheet tabs
export function HubInchargeBottomBar() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState('Dashboard');
  const [mounted, setMounted] = React.useState(false);
  const [userAllowedPages, setUserAllowedPages] = React.useState<string[]>([]);
  const [isLoadingPermissions, setIsLoadingPermissions] = React.useState(true);

  // Fetch user permissions from database
  React.useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!user?.id) {
        setIsLoadingPermissions(false);
        return;
      }

      try {
        const response = await fetch(`/api/permissions?userId=${user.id}`, {
          credentials: 'include',
        });

        if (response.ok) {
          const result = await response.json();
          const allowedPages = result.data?.allowedPages || result.allowedPages || [];
          setUserAllowedPages(allowedPages);
        }
      } catch (error) {
        console.error('[HubInchargeBottomBar] Error fetching permissions:', error);
      } finally {
        setIsLoadingPermissions(false);
      }
    };

    fetchUserPermissions();
  }, [user?.id]);

  React.useEffect(() => {
    setMounted(true);
    // Read tab from URL after mount to avoid hydration issues
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab') || 'Dashboard';
      setActiveTab(tab);
    }
  }, []);

  // All available tabs with their page keys
  const allNavItems: { name: string; icon: JSX.Element; pageKey: string }[] = [
    { name: 'Dashboard', icon: <Home size={16} />, pageKey: 'hub-incharge-dashboard' },
    { name: 'About Me', icon: <User size={16} />, pageKey: 'about-me' },
    { name: 'Approvals', icon: <CheckCircle size={16} />, pageKey: 'hub-incharge-approvals' },
    { name: 'Purchase', icon: <ShoppingCart size={16} />, pageKey: 'hub-incharge-purchase' },
    { name: 'Expenses', icon: <DollarSign size={16} />, pageKey: 'hub-incharge-expenses' },
    { name: 'Performance', icon: <BarChart3 size={16} />, pageKey: 'hub-incharge-performance' },
    { name: 'Messages', icon: <MessageCircle size={16} />, pageKey: 'hub-incharge-messages' },
    { name: 'Create Task', icon: <PlusCircle size={16} />, pageKey: 'hub-incharge-create-task' },
    { name: 'Tasks & Requests', icon: <ClipboardList size={16} />, pageKey: 'hub-incharge-tasks-requests' },
    { name: 'Settings', icon: <Settings size={16} />, pageKey: 'hub-incharge-settings' },
  ];

  // Filter tabs based on user permissions
  const navItems = React.useMemo(() => {
    if (isLoadingPermissions) return allNavItems; // Show all while loading
    
    return allNavItems.filter(item => {
      // Check if user has permission for this page
      return userAllowedPages.includes(item.pageKey);
    });
  }, [isLoadingPermissions, userAllowedPages]);

  const handleTabChange = (tabName: string) => {
    setActiveTab(tabName as any);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabName);
      router.replace(url.pathname + url.search);
  window.dispatchEvent(new CustomEvent('hub-tab-change', { detail: tabName }));
    } catch {
      router.replace(`?tab=${encodeURIComponent(tabName)}`);
  window.dispatchEvent(new CustomEvent('hub-tab-change', { detail: tabName }));
    }
  };

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <>
      {/* spacer to prevent content overlap with fixed bar */}
      <div className="h-16" aria-hidden />
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-[1200px] mx-auto px-3">
          <div className="bg-panel/80 backdrop-blur border-t border-theme rounded-t-xl overflow-x-auto">
            <div className="flex gap-2 items-center py-2 px-2">
              {navItems.map(item => (
                <button
                  key={item.name}
                  onClick={() => handleTabChange(item.name)}
                  className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm whitespace-nowrap ${
                    activeTab === item.name
                      ? 'bg-theme text-white font-semibold'
                      : 'text-muted hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {item.icon}
                  <span className="hidden sm:inline">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
