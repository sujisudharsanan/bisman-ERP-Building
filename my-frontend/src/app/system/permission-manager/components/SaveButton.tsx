'use client';

import React, { useState } from 'react';
import { useToast } from '@/components/ui/toast';

interface Props { onClick: () => Promise<void>; disabled?: boolean }

export default function SaveButton({ onClick, disabled }: Props) {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  return (
    <button
      onClick={async () => {
        if (busy || disabled) return;
        try {
          setBusy(true);
          await onClick();
          toast({ title: 'Permissions saved', variant: 'success' });
        } catch (e: any) {
          toast({ title: 'Failed to save', description: e?.message || 'Unknown error', variant: 'destructive' });
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy || disabled}
      className="inline-flex items-center gap-1.5 bg-yellow-600 disabled:opacity-60 disabled:cursor-not-allowed text-white px-2 py-1 rounded text-xs hover:bg-yellow-700 transition-colors"
    >
      {busy && <span className="h-3 w-3 rounded-full border-2 border-white border-t-transparent animate-spin" />}
      <span>Save Permissions</span>
    </button>
  );
}
