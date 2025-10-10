"use client";

import React from 'react';
import Lottie from 'lottie-react';
import loader from '@/assets/bisman-loader.json';

export interface BismanLoaderProps {
  size?: number; // px, fixed standard across screens
  className?: string;
}

export default function BismanLoader({ size = 128, className = '' }: BismanLoaderProps) {
  return (
    <div
      className={`grid place-items-center ${className}`}
      style={{ width: size, height: size }}
      aria-label="Loading"
      role="status"
    >
      <Lottie animationData={loader} loop autoplay style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
