"use client";

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
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

export default function HubInchargeTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams?.get('tab') as TabName) || 'Dashboard';
  const [activeTab, setActiveTab] = React.useState<TabName>(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams?.toString()]);

  const navItems: { name: TabName; icon: JSX.Element }[] = [
    { name: 'Dashboard', icon: <Home size={16} /> },
    { name: 'About Me', icon: <User size={16} /> },
    { name: 'Approvals', icon: <CheckCircle size={16} /> },
    { name: 'Purchase', icon: <ShoppingCart size={16} /> },
    { name: 'Expenses', icon: <DollarSign size={16} /> },
    { name: 'Performance', icon: <BarChart3 size={16} /> },
    { name: 'Messages', icon: <MessageCircle size={16} /> },
    { name: 'Create Task', icon: <PlusCircle size={16} /> },
    { name: 'Tasks & Requests', icon: <ClipboardList size={16} /> },
    { name: 'Settings', icon: <Settings size={16} /> },
  ];

  const handleTabChange = (tabName: TabName) => {
    setActiveTab(tabName);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabName);
      router.replace(url.pathname + url.search);
    } catch {
      // fallback: push to same path with search param
      router.replace(`?tab=${encodeURIComponent(tabName)}`);
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
