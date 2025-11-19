"use client";

// Manager Calendar page alias that reuses the global Calendar page implementation.
// This fixes broken sidebar navigation pointing to /manager/calendar while the
// actual calendar lived at /calendar. Keeping both routes allows existing
// header link (/calendar) and sidebar link (/manager/calendar) to function.

import CalendarPage from "@/app/calendar/page";

export default function ManagerCalendarPage() {
  return <CalendarPage />;
}
