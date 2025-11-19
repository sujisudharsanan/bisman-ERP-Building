"use client";
import { useState } from 'react';
import Link from 'next/link';

export default function AIHelpButton() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button onClick={() => setOpen(o=>!o)} className="rounded-full w-12 h-12 bg-blue-600 text-white shadow-lg">AI</button>
      {open && (
        <div className="absolute bottom-14 right-0 w-64 border rounded bg-white dark:bg-[#0b1220] dark:border-gray-700 p-2 shadow-lg space-y-2 text-sm">
          <Link className="block hover:underline dark:text-gray-200" href="/assistant">Open Assistant</Link>
          <button className="block w-full text-left hover:underline dark:text-gray-200" onClick={()=>location.href='/assistant'}>Ask a question</button>
        </div>
      )}
    </div>
  );
}
