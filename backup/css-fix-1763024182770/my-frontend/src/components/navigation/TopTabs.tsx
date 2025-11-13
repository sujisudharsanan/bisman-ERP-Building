'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export interface TopTabsTab {
  id: string;
  label: string;
  icon: LucideIcon;
  description?: string;
}

interface TopTabsProps {
  tabs: TopTabsTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function TopTabs({ tabs, activeTab, onTabChange }: TopTabsProps) {
  return (
    <div className="hidden lg:block mb-8">
      <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 relative px-4 py-3 rounded-md transition-all ${
                isActive 
                  ? 'text-gray-900 dark:text-white' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="topTabsIndicator"
                  className="absolute inset-0 bg-white dark:bg-gray-700 rounded-md shadow-sm"
                  transition={{
                    type: "spring",
                    stiffness: 500,
                    damping: 30
                  }}
                />
              )}
              
              <div className="relative flex items-center justify-center space-x-2">
                <Icon className="w-4 h-4" />
                <span className="font-medium text-sm">{tab.label}</span>
              </div>
              
              {tab.description && (
                <p className="relative text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {tab.description}
                </p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
