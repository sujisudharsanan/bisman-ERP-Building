"use client";

import React from 'react';
import dynamic from 'next/dynamic';

// Use the new modern calendar design (client-only)
const ModernCalendarPage = dynamic(() => import('./modern-calendar'), { ssr: false });

export default function CommonCalendarPage() {
  return <ModernCalendarPage />;
}
