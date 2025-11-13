"use client";
import { useEffect, useState } from 'react';

export default function WelcomePopup({ userName, onClose }: { userName?: string; onClose?: () => void }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setOpen(false); onClose && onClose(); }, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] pointer-events-none">
      <div className="absolute bottom-24 right-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 shadow-2xl rounded-xl p-4 w-[300px] sm:w-[360px] pointer-events-auto">
        <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
          {`Welcome back ${userName || 'there'} 👋😊\nWould you like to mark attendance now? I can also show your pending tasks, new mails, critical items and unread messages.`}
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={() => { setOpen(false); onClose && onClose(); }} className="text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-slate-800">Close</button>
        </div>
      </div>
    </div>
  );
}
