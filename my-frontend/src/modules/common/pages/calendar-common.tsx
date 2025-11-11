"use client";

import React from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import dynamic from 'next/dynamic';

// Reuse the global Calendar page implementation via dynamic import (client-only)
const CalendarPage = dynamic(() => import('@/app/calendar/page'), { ssr: false });

export default function CommonCalendarPage() {
  return (
    <SuperAdminLayout title="Calendar" description="Personal and team schedules">
      <div className="p-2 sm:p-4">
        <CalendarPage />
      </div>
    </SuperAdminLayout>
  );
}
