"use client";
import React, { useRef, useEffect, useState } from 'react';

type IconState = 'idle' | 'attentive' | 'listening' | 'thinking' | 'notify';

export default function BismanChatIcon({
  state = 'idle',
  unread = 0,
  logoSrc = '/brand/bisman-logo.svg',
  size = 64, // px, icon outer diameter
}: {
  state?: IconState;
  unread?: number;
  logoSrc?: string;
  size?: number;
}) {
  const isNotify = state === 'notify';
  const isThinking = state === 'thinking';
  const isListening = state === 'listening';
  const isAttentive = state === 'attentive';

  const px = `${size}px`;
  const imgRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const [isPointerInside, setIsPointerInside] = useState(false);

  // Canvas hover effect rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const deviceRatio = window.devicePixelRatio || 1;
    canvas.width = size * deviceRatio;
    canvas.height = size * deviceRatio;
    ctx.setTransform(deviceRatio, 0, 0, deviceRatio, 0, 0);

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Draw hover effect if pointer is inside
    if (isPointerInside && hover && isAttentive) {
      const r = size * 0.4; // hover ring radius
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = Math.max(2, Math.round(size / 20));
      
      // Animated gradient ring
      const gradient = ctx.createRadialGradient(hover.x, hover.y, r * 0.8, hover.x, hover.y, r);
      gradient.addColorStop(0, 'rgba(255, 165, 0, 0)');
      gradient.addColorStop(0.7, 'rgba(255, 165, 0, 0.6)');
      gradient.addColorStop(1, 'rgba(255, 165, 0, 0)');
      
      ctx.strokeStyle = gradient;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.arc(hover.x, hover.y, r, 0, Math.PI * 2);
      ctx.stroke();

      // Inner target ring
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(255, 165, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hover.x, hover.y, r * 0.6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }, [hover, isPointerInside, size, isAttentive]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHover({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsPointerInside(true);
  };

  const handleMouseLeave = () => {
    setIsPointerInside(false);
    setHover(null);
  };

  return (
    <div
      className={`relative rounded-full shadow-xl transition-all duration-300 ${isNotify ? 'animate-bounce-fast' : ''} ${isAttentive ? 'scale-105 shadow-2xl' : ''}`}
      style={{ width: px, height: px }}
      aria-label="ERP Buddy"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Interactive hover canvas overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none rounded-full"
        style={{ width: px, height: px }}
      />
      {/* Brand logo background */}
      <div className={`absolute inset-0 rounded-full overflow-hidden bg-white transition-all duration-300 ${isAttentive ? 'ring-2 ring-orange-400 ring-offset-2' : ''}`}>
        {/* Padded container so full logo is visible inside circle */}
        <div className="w-full h-full p-2">
          <img
            ref={imgRef}
            src={logoSrc}
            alt="BISMAN logo"
            className={`w-full h-full object-contain block transition-transform duration-300 ${isAttentive ? 'scale-110' : ''}`}
            onError={(e) => {
              const t = e.currentTarget as HTMLImageElement;
              // Fallback chain: try commonly used public paths, then gradient
              const tried = t.getAttribute('data-tried') || '';
              if (!tried.includes('alt1')) {
                t.setAttribute('data-tried', tried + ' alt1');
                t.src = '/bisman-logo.svg';
                return;
              }
              if (!tried.includes('alt2')) {
                t.setAttribute('data-tried', tried + ' alt2');
                t.src = '/logo.svg';
                return;
              }
              // Final fallback: hide image, show brand tint
              t.style.display = 'none';
              const parent = t.parentElement?.parentElement; // padded wrapper's parent
              if (parent) parent.classList.add('fallback-bg');
            }}
          />
        </div>
      </div>

      {/* Unread badge */}
      {unread > 0 && (
        <div className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] leading-4 min-w-4 h-4 px-1 rounded-full text-center select-none">
          {unread > 9 ? '9+' : unread}
        </div>
      )}

      {/* Smiley circle at lower‑right (acts as the small dot in logo) */}
      <div
        className={
          'absolute rounded-full flex items-center justify-center text-base transition-all duration-300 ' +
          'bg-white/90 text-yellow-600 shadow-lg ' +
          (isThinking ? 'orbit' : isListening ? 'heartbeat' : isAttentive ? 'wink glow-hover' : 'pulse')
        }
        style={{ 
          width: Math.max(20, size * 0.3), 
          height: Math.max(20, size * 0.3), 
          right: Math.max(2, size * 0.06), 
          bottom: Math.max(2, size * 0.06),
          boxShadow: isAttentive ? '0 0 20px rgba(255, 165, 0, 0.6)' : undefined
        }}
      >
        <span aria-hidden>🙂</span>
      </div>

      <style jsx>{`
        .fallback-bg { background: radial-gradient(circle at 30% 30%, #fde047, #facc15); }
        
        @keyframes gentlePulse { 
          0%, 100% { transform: scale(1); opacity: 1; } 
          50% { transform: scale(1.06); opacity: 0.95; } 
        }
        
        @keyframes heartBeat { 
          0%, 100% { transform: scale(1); } 
          25% { transform: scale(1.15); } 
          50% { transform: scale(0.97); } 
          75% { transform: scale(1.12); } 
        }
        
        @keyframes quickWink { 
          0% { transform: scaleY(1); } 
          50% { transform: scaleY(0.6); } 
          100% { transform: scaleY(1); } 
        }
        
        @keyframes fastBounce { 
          0%, 100% { transform: translateY(0); } 
          30% { transform: translateY(-10%); } 
          60% { transform: translateY(0); } 
        }
        
        @keyframes orbitAnim { 
          0% { transform: translate(0,0) rotate(0deg) translate(10px) rotate(0deg); }
          50% { transform: translate(0,0) rotate(180deg) translate(10px) rotate(-180deg); }
          100% { transform: translate(0,0) rotate(360deg) translate(10px) rotate(-360deg); } 
        }

        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 15px rgba(255, 165, 0, 0.4); }
          50% { box-shadow: 0 0 25px rgba(255, 165, 0, 0.8); }
        }

        .pulse { animation: gentlePulse 3.2s ease-in-out infinite; }
        .heartbeat { animation: heartBeat 1.4s ease-in-out infinite; }
        .wink { animation: quickWink 0.35s ease-in-out 1; }
        .animate-bounce-fast { animation: fastBounce 0.9s cubic-bezier(.28,.84,.42,1) 2; }
        .orbit { transform-origin: center; animation: orbitAnim 1.6s linear infinite; }
        .glow-hover { animation: glowPulse 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
