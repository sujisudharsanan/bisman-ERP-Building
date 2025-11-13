"use client";
import React from 'react';
import { Smile, MessageCircle } from 'lucide-react';

type IconState = 'idle' | 'attentive' | 'listening' | 'thinking' | 'notify';

export default function ChatSmileMessageIcon({
  state = 'idle',
  size = 64, // px diameter
}: {
  state?: IconState;
  size?: number;
}) {
  const isNotify = state === 'notify';
  const isThinking = state === 'thinking';
  const isListening = state === 'listening';
  const isAttentive = state === 'attentive';
  const px = `${size}px`;

  return (
    <div
      className={`relative rounded-full shadow-xl bg-white border border-gray-200 ${isNotify ? 'animate-bounce-fast' : ''}`}
      style={{ width: px, height: px }}
      aria-label="Chat"
    >
      {/* Smile face */}
      <div className="absolute inset-0 flex items-center justify-center">
        <Smile className="text-yellow-600" style={{ width: Math.max(28, size * 0.46), height: Math.max(28, size * 0.46) }} />
      </div>
      {/* Message bubble overlay */}
      <div
        className={
          'absolute rounded-full flex items-center justify-center bg-white border border-indigo-200 ' +
          (isThinking ? 'orbit' : isListening ? 'heartbeat' : isAttentive ? 'wink' : 'pulse')
        }
        style={{
          width: Math.max(18, size * 0.32),
          height: Math.max(18, size * 0.32),
          right: Math.max(2, size * 0.06),
          bottom: Math.max(2, size * 0.06),
        }}
      >
        <MessageCircle className="text-indigo-600" style={{ width: '70%', height: '70%' }} />
      </div>

      <style jsx>{`
        @keyframes gentlePulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.06); opacity: 0.97; } }
        @keyframes heartBeat { 0%, 100% { transform: scale(1); } 25% { transform: scale(1.15); } 50% { transform: scale(0.97); } 75% { transform: scale(1.12); } }
        @keyframes quickWink { 0% { transform: scaleY(1); } 50% { transform: scaleY(0.6); } 100% { transform: scaleY(1); } }
        @keyframes fastBounce { 0%, 100% { transform: translateY(0); } 30% { transform: translateY(-10%); } 60% { transform: translateY(0); } }
        @keyframes orbitAnim { 0% { transform: rotate(0deg); } 50% { transform: rotate(180deg); } 100% { transform: rotate(360deg); } }
        .pulse { animation: gentlePulse 3.2s ease-in-out infinite; }
        .heartbeat { animation: heartBeat 1.4s ease-in-out infinite; }
        .wink { animation: quickWink 0.35s ease-in-out 1; }
        .animate-bounce-fast { animation: fastBounce 0.9s cubic-bezier(.28,.84,.42,1) 2; }
        .orbit { transform-origin: center; animation: orbitAnim 1.6s linear infinite; }
      `}</style>
    </div>
  );
}
