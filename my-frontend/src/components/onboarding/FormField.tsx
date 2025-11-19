"use client";
import React from 'react';
interface FormFieldProps { label: string; children: React.ReactNode; tooltip?: string; error?: string; required?: boolean; }
export default function FormField({ label, children, tooltip, error, required }: FormFieldProps) {
  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-center gap-1">
        <label className="font-medium">{label}{required && <span className="text-red-600">*</span>}</label>
        {tooltip && <span tabIndex={0} aria-label={tooltip} className="inline-block w-4 h-4 rounded-full bg-gray-300 text-gray-700 text-[10px] flex items-center justify-center" title={tooltip}>?</span>}
      </div>
      {children}
      {error && <p className="text-red-600" role="alert">{error}</p>}
    </div>
  );
}
