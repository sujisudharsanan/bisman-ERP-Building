'use client';

import React from 'react';

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  decorative?: boolean;
}

export function Separator({
  orientation = 'horizontal',
  className = '',
  decorative = true,
}: SeparatorProps) {
  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      role={decorative ? 'none' : 'separator'}
      aria-orientation={decorative ? undefined : orientation}
      className={`
        shrink-0 bg-gray-200 dark:bg-gray-700
        ${isHorizontal ? 'h-[1px] w-full' : 'h-full w-[1px]'}
        ${className}
      `}
    />
  );
}

export default Separator;
