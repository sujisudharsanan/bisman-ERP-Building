/**
 * ============================================================================
 * DECISION LOAD MAP PAGE
 * ============================================================================
 * 
 * Business Pressure & Decision Flow Map visualization page.
 * Accessible to L6+ (Manager and above) - main target audience is CEO/Admin (L9+)
 * 
 * Features:
 * - Role stress visualization with live metrics
 * - Approval flow edge visualization
 * - Admin pressure analysis
 * - Simulation engine for what-if scenarios
 * - Task trace for live path visualization
 */

'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with the graph visualization
const DecisionLoadMap = dynamic(
  () => import('@/components/decision-load/DecisionLoadMap'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading Decision Load Map...</p>
        </div>
      </div>
    )
  }
);

export default function DecisionLoadPage() {
  return <DecisionLoadMap />;
}
