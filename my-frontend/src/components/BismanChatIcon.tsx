"use client";
import React from 'react';

type IconState = 'idle' | 'attentive' | 'listening' | 'thinking' | 'notify';

export default function BismanChatIcon({ state = 'idle', unread = 0 }: { state?: IconState; unread?: number }) {
  const isNotify = state === 'notify';
  const isThinking = state === 'thinking';
  const isListening = state === 'listening';
  const isAttentive = state === 'attentive';

  return (
    <div className={`relative w-14 h-14 rounded-full shadow-xl ${isNotify ? 'animate-bounce-fast' : ''}`} aria-label="ERP Buddy">
      {/* Brand logo background */}
      <div className="absolute inset-0 rounded-full overflow-hidden">
        {/* Use your SVG from public/assets; graceful fallback tint */}
        <img
          src="/assets/bisman-logo.svg"
          alt="BISMAN logo"
          className="w-full h-full object-contain"
          onError={(e) => {
            // fallback to yellow gradient circle
            const t = e.currentTarget as HTMLImageElement;
            t.style.display = 'none';
            const parent = t.parentElement;
            if (parent) parent.classList.add('fallback-bg');
          }}
        />
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
          'absolute w-6 h-6 rounded-full flex items-center justify-center text-base ' +
          'right-1 bottom-1 bg-white/90 text-yellow-600 ' +
          (isThinking ? 'orbit' : isListening ? 'heartbeat' : isAttentive ? 'wink' : 'pulse')
        }
      >
        <span aria-hidden>🙂</span>
      </div>

      <style jsx>{`
        .fallback-bg { background: radial-gradient(circle at 30% 30%, #fde047, #facc15); }
        @keyframes gentlePulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.06); opacity: 0.95; } }
        @keyframes heartBeat { 0%, 100% { transform: scale(1); } 25% { transform: scale(1.15); } 50% { transform: scale(0.97); } 75% { transform: scale(1.12); } }
        @keyframes quickWink { 0% { transform: scaleY(1); } 50% { transform: scaleY(0.6); } 100% { transform: scaleY(1); } }
        @keyframes fastBounce { 0%, 100% { transform: translateY(0); } 30% { transform: translateY(-10%); } 60% { transform: translateY(0); } }
        @keyframes orbitAnim { 0% { transform: translate(0,0) rotate(0deg) translate(10px) rotate(0deg); }
                               50% { transform: translate(0,0) rotate(180deg) translate(10px) rotate(-180deg); }
                               100% { transform: translate(0,0) rotate(360deg) translate(10px) rotate(-360deg); } }

        .pulse { animation: gentlePulse 3.2s ease-in-out infinite; }
        .heartbeat { animation: heartBeat 1.4s ease-in-out infinite; }
        .wink { animation: quickWink 0.35s ease-in-out 1; }
        .animate-bounce-fast { animation: fastBounce 0.9s cubic-bezier(.28,.84,.42,1) 2; }
        .orbit { transform-origin: center; animation: orbitAnim 1.6s linear infinite; }
      `}</style>
    </div>
  );
}
