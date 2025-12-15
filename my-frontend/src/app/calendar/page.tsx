/**
 * Calendar Page - Task Deadlines Calendar
 * Replaced old event-based calendar with task deadlines view
 */

'use client';

import dynamic from 'next/dynamic';

// Use the new modern calendar that shows task deadlines
const ModernCalendarPage = dynamic(
  () => import('@/modules/common/pages/modern-calendar'),
  { ssr: false }
);

export default function CalendarPage() {
  return <ModernCalendarPage />;
}
