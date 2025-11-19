"use client";
import React from 'react';

type Props = {
  status: 'ringing' | 'live' | 'ended';
  onJoin?: () => void;
  onEnd?: () => void;
  participants?: number;
  title?: string;
};

export default function CallBanner({ status, onJoin, onEnd, participants = 1, title = 'Group Call' }: Props) {
  return (
    <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md">
      <div className="text-sm text-blue-900 dark:text-blue-200">
        <strong>{title}</strong>
        <span className="ml-2">{status === 'ringing' ? 'Starting…' : status === 'live' ? 'Live' : 'Ended'}</span>
        <span className="ml-3 text-xs opacity-80">{participants} participants</span>
      </div>
      <div className="flex gap-2">
        {status !== 'ended' && (
          <button onClick={onJoin} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md">Join</button>
        )}
        {status === 'live' && (
          <button onClick={onEnd} className="px-3 py-1 text-sm bg-red-600 text-white rounded-md">End</button>
        )}
      </div>
    </div>
  );
}
