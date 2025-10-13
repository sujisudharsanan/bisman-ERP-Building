"use client";

import React from 'react';
import LogoMaskLoader from '@/components/loading/LogoMaskLoader';

export default function RootLoading() {
  return <LogoMaskLoader fillDuration={3000} fadeDuration={800} />;
}
