'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { dashboardConnections, DashboardGraphType } from '@/config/dashboardConnections';

type ConnectedCardProps = {
  type: DashboardGraphType;
  className?: string;
  children: React.ReactNode;
};

const ConnectedCard: React.FC<ConnectedCardProps> = ({ type, className = '', children }) => {
  const router = useRouter();
  const cfg = dashboardConnections[type];

  const handleNavigate = () => {
    if (!cfg?.route) {
      console.warn(`[dashboardConnections] Missing route for type: ${type}`);
      return;
    }
    router.push(cfg.route);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={cfg?.description || type}
      onClick={handleNavigate}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleNavigate()}
      className={`cursor-pointer bg-gray-800/40 rounded-xl border border-gray-700/30 shadow-sm hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${className}`}
    >
      {children}
    </div>
  );
};

export default ConnectedCard;
