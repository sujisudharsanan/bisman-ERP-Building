"use client";
import React from 'react';
export default function ProgressBar({ percent }: { percent: number }) {
  const p = Math.min(100, Math.max(0, percent));
  return (
    <div className="w-full h-2 bg-gray-200 rounded" aria-label="Progress Bar">
      <div className="h-2 bg-green-600 rounded" style={{ width: p+'%' }} aria-valuenow={p} aria-valuemin={0} aria-valuemax={100}></div>
    </div>
  );
}
