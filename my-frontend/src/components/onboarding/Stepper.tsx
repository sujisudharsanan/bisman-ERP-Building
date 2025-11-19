"use client";
import React from 'react';
interface StepperProps { steps: string[]; current: number; }
export default function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex flex-wrap gap-2" aria-label="Onboarding Steps">
      {steps.map((s,i) => (
        <li key={s} className={`flex items-center gap-1 text-xs ${i+1===current? 'font-semibold text-blue-700':'text-gray-500'}`}>\n          <span className={`h-5 w-5 flex items-center justify-center rounded-full text-white text-[10px] ${i+1<=current? 'bg-blue-600':'bg-gray-300'}`}>{i+1}</span>{s}
        </li>
      ))}
    </ol>
  );
}
