'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export interface DashboardTopTab {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

interface DashboardTopTabsProps {
  tabs: DashboardTopTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function DashboardTopTabs({ tabs, activeTab, onTabChange }: DashboardTopTabsProps) {
  return (
    <div className="hidden lg:flex items-center gap-1 bg-transparent">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`relative px-3 py-2 transition-all flex items-center gap-1.5 rounded-md ${
              isActive 
                ? 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
            aria-label={tab.label}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <motion.div
                layoutId="dashboardTopTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                transition={{
                  type: "spring",
                  stiffness: 500,
                  damping: 30
                }}
              />
            )}
            
            <Icon className="w-3.5 h-3.5" />
            <span className="font-medium text-xs whitespace-nowrap">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
