"use client";

import React, { useState } from 'react';
import { LogoMaskLoader } from '@/components/loading';

export default function LoaderDemo() {
  const [showLoader, setShowLoader] = useState(false);

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'grid', 
      placeItems: 'center', 
      background: '#111', 
      color: '#eee',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '2rem' }}>
          Logo Mask Loader Demo
        </h1>
        
        <button
          onClick={() => setShowLoader(true)}
          style={{
            padding: '1rem 2rem',
            fontSize: '1.125rem',
            background: 'linear-gradient(180deg, #ffd84a, #f0b400)',
            color: '#0d0d0d',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Show Loader
        </button>

        <div style={{ marginTop: '2rem', opacity: 0.7 }}>
          <p>The loader will:</p>
          <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
            <li>✨ Fill the logo from bottom to top (3 seconds)</li>
            <li>🌊 Fade out smoothly (0.8 seconds)</li>
            <li>🎯 Auto-hide when complete</li>
          </ul>
        </div>
      </div>

      {showLoader && (
        <LogoMaskLoader
          fillDuration={3000}
          fadeDuration={800}
          onLoadComplete={() => {
            setShowLoader(false);
            console.log('Loader completed!');
          }}
        />
      )}
    </div>
  );
}
