"use client";
import React from 'react';
interface SaveDraftButtonProps { onClick: ()=>void; disabled?: boolean; }
export default function SaveDraftButton({ onClick, disabled }: SaveDraftButtonProps) {
  return <button type="button" onClick={onClick} disabled={disabled} className="px-3 py-2 bg-yellow-500 disabled:opacity-50 text-white rounded text-xs">Save as Draft</button>;
}
