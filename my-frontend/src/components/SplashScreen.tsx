"use client";

import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  companyName?: string;
  subline?: string;
  onComplete?: () => void;
  duration?: number; // in milliseconds
}

export default function SplashScreen({
  companyName = "BISMAN ERP",
  subline = "Designed for you",
  onComplete,
  duration = 1700
}: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration - 400);

    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden transition-all duration-400 ${
        isExiting ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: '#050508' }}
    >
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated multicolor gradient mesh */}
        <div 
          className="absolute inset-[-50%] w-[200%] h-[200%] animate-gradient-rotate"
          style={{
            background: `
              conic-gradient(
                from 0deg at 50% 50%,
                #6366f1 0deg,
                #8b5cf6 60deg,
                #06b6d4 120deg,
                #10b981 180deg,
                #3b82f6 240deg,
                #ec4899 300deg,
                #6366f1 360deg
              )
            `,
            filter: 'blur(80px)',
            opacity: 0.4,
          }}
        />

        {/* Dark overlay for contrast */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at 50% 50%, rgba(5,5,8,0.7) 0%, rgba(5,5,8,0.9) 70%)'
          }}
        />

        {/* Floating Glowing Orbs */}
        <div className="absolute inset-0">
          {/* Large indigo orb */}
          <div 
            className="absolute w-[500px] h-[500px] rounded-full animate-orb-1"
            style={{
              top: '-15%',
              right: '-10%',
              background: 'radial-gradient(circle, rgba(99, 102, 241, 0.6) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
          
          {/* Teal orb */}
          <div 
            className="absolute w-[400px] h-[400px] rounded-full animate-orb-2"
            style={{
              bottom: '-10%',
              left: '-5%',
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.5) 0%, transparent 70%)',
              filter: 'blur(50px)',
            }}
          />

          {/* Purple orb */}
          <div 
            className="absolute w-[350px] h-[350px] rounded-full animate-orb-3"
            style={{
              top: '30%',
              left: '10%',
              background: 'radial-gradient(circle, rgba(168, 85, 247, 0.5) 0%, transparent 70%)',
              filter: 'blur(45px)',
            }}
          />

          {/* Emerald orb */}
          <div 
            className="absolute w-[300px] h-[300px] rounded-full animate-orb-4"
            style={{
              bottom: '20%',
              right: '15%',
              background: 'radial-gradient(circle, rgba(16, 185, 129, 0.5) 0%, transparent 70%)',
              filter: 'blur(40px)',
            }}
          />

          {/* Pink accent orb */}
          <div 
            className="absolute w-[250px] h-[250px] rounded-full animate-orb-5"
            style={{
              top: '15%',
              left: '40%',
              background: 'radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, transparent 70%)',
              filter: 'blur(35px)',
            }}
          />
        </div>

        {/* Animated Grid */}
        <div 
          className="absolute inset-0 animate-grid-pulse"
          style={{
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />

        {/* Moving grid lines */}
        <div 
          className="absolute inset-0 animate-grid-move opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 2px, transparent 2px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 2px, transparent 2px)
            `,
            backgroundSize: '120px 120px',
          }}
        />
      </div>

      {/* Premium Card */}
      <div 
        className={`relative z-10 ${isExiting ? 'animate-card-exit' : 'animate-card-enter'}`}
      >
        {/* Glass card container */}
        <div 
          className="relative px-16 py-12 rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: `
              0 0 0 1px rgba(255,255,255,0.05),
              0 25px 50px -12px rgba(0,0,0,0.5),
              0 0 100px rgba(99, 102, 241, 0.2),
              inset 0 1px 0 rgba(255,255,255,0.1)
            `,
          }}
        >
          {/* Card inner glow */}
          <div 
            className="absolute inset-0 rounded-3xl opacity-50"
            style={{
              background: 'radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.15) 0%, transparent 60%)',
            }}
          />

          {/* Shimmer effect on card */}
          <div 
            className="absolute inset-0 animate-shimmer-card"
            style={{
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.1) 50%, transparent 60%)',
              backgroundSize: '200% 100%',
            }}
          />

          {/* Content */}
          <div className="relative text-center">
            {/* Company Logo/Icon placeholder */}
            <div className="mb-6 flex justify-center">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center animate-logo-pop"
                style={{
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #06b6d4 100%)',
                  boxShadow: '0 10px 40px rgba(99, 102, 241, 0.4)',
                }}
              >
                <span className="text-white text-2xl font-bold">B</span>
              </div>
            </div>

            {/* Company Name */}
            <h1 
              className="text-4xl md:text-5xl font-bold tracking-tight mb-3 animate-text-pop"
              style={{
                fontFamily: "'Inter', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
                background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 40%, #c7d2fe 70%, #a5b4fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {companyName}
            </h1>

            {/* Subline */}
            <p 
              className="text-sm tracking-[0.25em] uppercase animate-subline-pop"
              style={{
                fontFamily: "'Inter', 'SF Pro Text', -apple-system, BlinkMacSystemFont, sans-serif",
                color: 'rgba(165, 180, 252, 0.8)',
              }}
            >
              {subline}
            </p>

            {/* Decorative dots */}
            <div className="flex justify-center gap-1.5 mt-6 animate-dots-pop">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400/60 animate-dot-pulse" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-purple-400/60 animate-dot-pulse" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 animate-dot-pulse" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Inline Styles for Animations */}
      <style jsx>{`
        @keyframes gradient-rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes orb-1 {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          50% { transform: translate(-30px, 30px) scale(1.1); opacity: 0.8; }
        }
        
        @keyframes orb-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, -20px) scale(1.15); }
        }
        
        @keyframes orb-3 {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(25px, -25px); }
          66% { transform: translate(-15px, 15px); }
        }
        
        @keyframes orb-4 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-35px, -25px) scale(1.1); }
        }
        
        @keyframes orb-5 {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(20px, 30px); }
        }
        
        @keyframes grid-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(120px, 120px); }
        }
        
        @keyframes card-enter {
          0% { 
            opacity: 0; 
            transform: scale(0.8) translateY(30px);
          }
          60% {
            transform: scale(1.02) translateY(-5px);
          }
          100% { 
            opacity: 1; 
            transform: scale(1) translateY(0);
          }
        }
        
        @keyframes card-exit {
          0% { 
            opacity: 1; 
            transform: scale(1) translateY(0);
          }
          100% { 
            opacity: 0; 
            transform: scale(0.95) translateY(-40px);
          }
        }
        
        @keyframes logo-pop {
          0% { 
            opacity: 0; 
            transform: scale(0.5) rotate(-10deg);
          }
          60% {
            transform: scale(1.1) rotate(2deg);
          }
          100% { 
            opacity: 1; 
            transform: scale(1) rotate(0deg);
          }
        }
        
        @keyframes text-pop {
          0% { 
            opacity: 0; 
            transform: translateY(15px);
          }
          100% { 
            opacity: 1; 
            transform: translateY(0);
          }
        }
        
        @keyframes subline-pop {
          0% { 
            opacity: 0; 
            transform: translateY(10px);
          }
          100% { 
            opacity: 1; 
            transform: translateY(0);
          }
        }
        
        @keyframes dots-pop {
          0% { 
            opacity: 0; 
            transform: scale(0);
          }
          60% {
            transform: scale(1.2);
          }
          100% { 
            opacity: 1; 
            transform: scale(1);
          }
        }
        
        @keyframes dot-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        
        @keyframes shimmer-card {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        
        .animate-gradient-rotate { animation: gradient-rotate 20s linear infinite; }
        .animate-orb-1 { animation: orb-1 8s ease-in-out infinite; }
        .animate-orb-2 { animation: orb-2 10s ease-in-out infinite; }
        .animate-orb-3 { animation: orb-3 12s ease-in-out infinite; }
        .animate-orb-4 { animation: orb-4 9s ease-in-out infinite; }
        .animate-orb-5 { animation: orb-5 11s ease-in-out infinite; }
        .animate-grid-pulse { animation: grid-pulse 4s ease-in-out infinite; }
        .animate-grid-move { animation: grid-move 20s linear infinite; }
        .animate-card-enter { animation: card-enter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .animate-card-exit { animation: card-exit 0.4s cubic-bezier(0.4, 0, 1, 1) forwards; }
        .animate-logo-pop { animation: logo-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.1s both; }
        .animate-text-pop { animation: text-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both; }
        .animate-subline-pop { animation: subline-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both; }
        .animate-dots-pop { animation: dots-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s both; }
        .animate-dot-pulse { animation: dot-pulse 1.5s ease-in-out infinite; }
        .animate-shimmer-card { animation: shimmer-card 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
