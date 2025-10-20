"use client";

import React from 'react';
import Image from 'next/image';

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
      {/* Logo with Spinning Border and Pulse */}
      <div className="relative" style={{ width: '100%', height: '100%' }}>
        {/* Spinning Border */}
        <div 
          className="absolute inset-0 border-4 border-transparent border-t-yellow-500 rounded-full animate-spin"
          style={{ borderTopWidth: '4px' }}
        />
        
        {/* Bisman Logo with Pulse */}
        <div className="absolute inset-0 flex items-center justify-center p-4 animate-pulse">
          <Image
            src="/brand/bisman-logo.svg"
            alt="Bisman Logo"
            width={size * 0.6}
            height={size * 0.6}
            className="object-contain"
            priority
          />
        </div>
      </div>
    </div>
  );
}
