'use client';

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

export interface DashboardNavTab {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

interface DashboardBottomNavProps {
  tabs: DashboardNavTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function DashboardBottomNav({ tabs, activeTab, onTabChange }: DashboardBottomNavProps) {
  return (
    <>
      {/* Bottom Navigation - Mobile Only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0a0e27] dark:bg-[#0a0e27] border-t border-gray-800 z-50 safe-bottom">
        <div className="flex items-center justify-around h-16 pb-safe">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center justify-center flex-1 h-full relative transition-colors hover:bg-gray-700/50 dark:hover:bg-gray-600/50 rounded-lg"
                aria-label={tab.label}
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="dashboardBottomNavIndicator"
                    className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500"
                    transition={{
                      type: "spring",
                      stiffness: 500,
                      damping: 30
                    }}
                  />
                )}
                
                {/* Icon */}
                <motion.div
                  animate={{
                    scale: isActive ? 1.1 : 1,
                    y: isActive ? -2 : 0
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 20
                  }}
                >
                  <Icon 
                    className={`w-5 h-5 mb-1 transition-colors ${
                      isActive 
                        ? 'text-blue-500' 
                        : 'text-gray-400 group-hover:text-gray-200'
                    }`}
                  />
                </motion.div>
                
                {/* Label */}
                <span
                  className={`text-[10px] transition-colors truncate max-w-[60px] ${
                    isActive 
                      ? 'text-blue-400 font-semibold' 
                      : 'text-gray-400'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
      
      {/* Spacer for fixed bottom nav on mobile */}
      <div className="lg:hidden h-16" />
    </>
  );
}
