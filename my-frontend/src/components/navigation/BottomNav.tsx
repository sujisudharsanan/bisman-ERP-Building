'use client';

import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

export interface BottomNavTab {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

interface BottomNavProps {
  tabs: BottomNavTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function BottomNav({ tabs, activeTab, onTabChange }: BottomNavProps) {
  return (
    <>
      {/* Bottom Navigation - Mobile Only */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 safe-bottom">
        <div className="flex items-center justify-around h-16 pb-safe">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className="flex flex-col items-center justify-center flex-1 h-full relative"
              >
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="bottomNavIndicator"
                    className="absolute top-0 left-0 right-0 h-0.5 bg-amber-400"
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
                        ? 'text-amber-500 dark:text-amber-400' 
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  />
                </motion.div>
                
                {/* Label */}
                <motion.span
                  animate={{
                    fontWeight: isActive ? 600 : 400,
                    color: isActive 
                      ? 'rgb(245 158 11)' // amber-500
                      : 'rgb(107 114 128)' // gray-500
                  }}
                  className={`text-xs transition-colors ${
                    isActive 
                      ? 'text-amber-500 dark:text-amber-400 font-semibold' 
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {tab.label}
                </motion.span>
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
