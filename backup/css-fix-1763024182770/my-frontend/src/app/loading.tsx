"use client";

import React from 'react';
import BismanLoader from '@/components/loading/BismanLoader';

export default function RootLoading() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'transparent',
        zIndex: 9999,
      }}
      aria-hidden
    >
      <BismanLoader size={128} />
    </div>
  );
}
