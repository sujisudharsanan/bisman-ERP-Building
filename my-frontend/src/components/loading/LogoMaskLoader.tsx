"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

interface LogoMaskLoaderProps {
  onLoadComplete?: () => void;
  fillDuration?: number; // in milliseconds
  fadeDuration?: number; // in milliseconds
}

export default function LogoMaskLoader({
  onLoadComplete,
  fillDuration = 3000,
  fadeDuration = 800,
}: LogoMaskLoaderProps) {
  const [fillHeight, setFillHeight] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Start filling the logo after a brief delay
    const fillTimer = setTimeout(() => {
      setFillHeight(100);
    }, 300);

    // Fade out after fill completes
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, fillDuration + 500);

    // Hide completely after fade out
    const hideTimer = setTimeout(() => {
      setHidden(true);
      if (onLoadComplete) {
        onLoadComplete();
      }
    }, fillDuration + 500 + fadeDuration);

    return () => {
      clearTimeout(fillTimer);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [fillDuration, fadeDuration, onLoadComplete]);

  if (hidden) {
    return null;
  }

  return (
    <div
      className={`loader ${fadeOut ? 'fade-out' : ''}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: '#0d0d0d',
        zIndex: 9999,
        opacity: fadeOut ? 0 : 1,
        transition: `opacity ${fadeDuration}ms ease`,
      }}
    >
      <div
        className="logo-mask"
        style={{
          width: '200px',
          height: '200px',
          position: 'relative',
          overflow: 'hidden',
          WebkitMaskImage: 'url(/bisman_logo.png)',
          WebkitMaskSize: 'contain',
          WebkitMaskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskImage: 'url(/bisman_logo.png)',
          maskSize: 'contain',
          maskRepeat: 'no-repeat',
          maskPosition: 'center',
        }}
      >
        <div
          className="fill"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: `${fillHeight}%`,
            background: 'linear-gradient(180deg, #ffd84a, #f0b400)',
            transition: `height ${fillDuration}ms ease-in-out`,
          }}
        />
      </div>
    </div>
  );
}
