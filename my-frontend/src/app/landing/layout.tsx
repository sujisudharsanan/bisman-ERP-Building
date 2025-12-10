"use client";

import { useEffect, useState } from 'react';
import React from 'react';

// Preload critical fonts for faster LCP
const fontUrl = 'https://fonts.googleapis.com/css2?family=Jost:wght@500;600;700&family=Open+Sans:wght@400;500;600&family=Poppins:wght@400;500;600&display=swap';

// Critical CSS for loading overlay
const criticalCSS = `
.landing-loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #093562 0%, #061f3a 100%);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s ease-out, visibility 0.3s ease-out;
}
.landing-loading-overlay.hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}
.landing-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #47b2e4;
  border-radius: 50%;
  animation: landing-spin 1s linear infinite;
}
@keyframes landing-spin {
  to { transform: rotate(360deg); }
}
`;

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Force light mode for landing page and preload fonts - completely standalone
  useEffect(() => {
    // Preload font
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = fontUrl;
    document.head.appendChild(link);
    
    // Add font stylesheet
    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = fontUrl;
    document.head.appendChild(styleLink);

    // Force light mode - no dependency on ThemeContext
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
    document.body.style.backgroundColor = 'white';
    document.body.style.color = '#1f2937';
    
    // Cleanup on unmount
    return () => {
      document.body.style.backgroundColor = '';
      document.body.style.color = '';
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: criticalCSS }} />
      {children}
    </>
  );
}
