'use client';

import React, { useState } from 'react';
import { Home, MessageSquare, CheckSquare, Calendar, BarChart2, Globe, Settings } from 'lucide-react';

const DashboardSidebar: React.FC = () => {
  const [activeIcon, setActiveIcon] = useState('dashboard');

  const menuItems = [
    { id: 'dashboard', icon: Home, label: 'Dashboard' },
    { id: 'messages', icon: MessageSquare, label: 'Messages' },
    { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
    { id: 'calendar', icon: Calendar, label: 'Calendar' },
    { id: 'reports', icon: BarChart2, label: 'Reports' },
    { id: 'globe', icon: Globe, label: 'Globe' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <aside className="w-20 bg-gray-900/50 backdrop-blur-sm border-r border-gray-800/50 flex flex-col items-center py-8 space-y-6">
      {menuItems.map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setActiveIcon(id)}
          className={`
            p-3 rounded-xl transition-all duration-300
            ${activeIcon === id 
              ? 'bg-indigo-500/20 border border-indigo-500/50 shadow-lg shadow-indigo-500/30 text-white' 
              : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }
          `}
          aria-label={label}
          title={label}
        >
          <Icon size={24} />
        </button>
      ))}
    </aside>
  );
};

export default DashboardSidebar;
