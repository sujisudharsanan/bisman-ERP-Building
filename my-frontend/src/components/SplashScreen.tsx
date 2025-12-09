"use client";

import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
}

export default function SplashScreen({
  onComplete,
  duration = 3000
}: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showContent, setShowContent] = useState(true);
  const [displayedText, setDisplayedText] = useState('Designed ');
  const [phase, setPhase] = useState<'typing1' | 'pause' | 'deleting' | 'typing2' | 'done'>('typing1');
  
  const prefix = 'Designed ';
  const typePart1 = 'for genius';
  const deleteWord = 'genius';
  const typePart2 = 'you';

  useEffect(() => {
    let charIndex = 0;
    let currentPhase: 'typing1' | 'pause' | 'deleting' | 'typing2' | 'done' = 'typing1';
    let pauseCount = 0;
    
    const interval = setInterval(() => {
      if (currentPhase === 'typing1') {
        if (charIndex < typePart1.length) {
          setDisplayedText(prefix + typePart1.slice(0, charIndex + 1));
          charIndex++;
        } else {
          currentPhase = 'pause';
          setPhase('pause');
          pauseCount = 0;
        }
      } else if (currentPhase === 'pause') {
        pauseCount++;
        if (pauseCount >= 1) {
          currentPhase = 'deleting';
          setPhase('deleting');
          charIndex = deleteWord.length;
        }
      } else if (currentPhase === 'deleting') {
        if (charIndex > 0) {
          charIndex--;
          setDisplayedText(prefix + 'for ' + deleteWord.slice(0, charIndex));
        } else {
          currentPhase = 'typing2';
          setPhase('typing2');
          charIndex = 0;
        }
      } else if (currentPhase === 'typing2') {
        if (charIndex < typePart2.length) {
          setDisplayedText(prefix + 'for ' + typePart2.slice(0, charIndex + 1));
          charIndex++;
        } else {
          currentPhase = 'done';
          setPhase('done');
          clearInterval(interval);
        }
      }
    }, 50);

    const fadeOutTimer = setTimeout(() => {
      setShowContent(false);
    }, 200);

    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      onComplete?.();
    }, duration);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeOutTimer);
      clearTimeout(completeTimer);
    };
  }, [duration, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="splash-screen-container">
      <style jsx global>{`
        .splash-screen-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 9999;
          font-family: 'Montserrat', sans-serif;
        }
        
        .splash-hero-section {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .splash-hero-bg {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: #ffffff;
          overflow: hidden;
        }
        
        .splash-hero-bg::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: 
            radial-gradient(circle at 20% 80%, rgba(102, 126, 234, 0.08) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(118, 75, 162, 0.06) 0%, transparent 40%),
            radial-gradient(circle at 40% 40%, rgba(240, 147, 251, 0.05) 0%, transparent 30%);
          animation: splashFloat 20s ease-in-out infinite;
        }
        
        .splash-hero-bg::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: 
            radial-gradient(ellipse at 10% 90%, rgba(102, 126, 234, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 90% 10%, rgba(240, 147, 251, 0.08) 0%, transparent 50%);
        }
        
        @keyframes splashFloat {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(2%, 2%) rotate(1deg); }
          66% { transform: translate(-1%, 1%) rotate(-1deg); }
        }
        
        .splash-hero-content {
          position: relative;
          z-index: 10;
          text-align: center;
          color: #333;
          padding: 0 20px;
          max-width: 800px;
        }
        
        .splash-logo-container {
          margin-bottom: 2rem;
          animation: splashFadeIn 2.5s ease-out forwards;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .splash-logo-container.fade-out {
          animation: splashFadeOut 1s ease-out forwards;
        }
        
        .splash-bisman-logo {
          width: 280px;
          height: auto;
        }
        
        @media (min-width: 768px) {
          .splash-bisman-logo {
            width: 500px;
          }
        }
        
        @keyframes splashFadeIn {
          0% {
            opacity: 0;
            transform: translateY(-20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes splashFadeOut {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(20px);
          }
        }
        
        .splash-hero-bg.fade-out {
          animation: splashBgFadeOut 1s ease-out forwards;
        }
        
        @keyframes splashBgFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
        
        .splash-title-heading {
          font-size: 2.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
          line-height: 1.3;
        }
        
        .splash-title-heading.fade-out {
          animation: splashFadeOut 1s ease-out forwards;
        }
        
        @media (min-width: 768px) {
          .splash-title-heading {
            font-size: 3.375rem;
          }
        }
        
        .splash-typing-text {
          display: inline;
        }
        
        .splash-typing-cursor {
          display: inline-block;
          width: 3px;
          height: 1em;
          background-color: #093562;
          margin-left: 2px;
          animation: splashBlink 0.7s infinite;
          vertical-align: text-bottom;
        }
        
        @keyframes splashBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        
        .splash-designed-text {
          color: #093562;
        }
        
        .splash-for-you-text {
          color: #eab308;
        }
      `}</style>

      <section className="splash-hero-section">
        <div className={`splash-hero-bg ${!showContent ? 'fade-out' : ''}`}></div>
        
        <div className="splash-hero-content">
          <div className={`splash-logo-container ${!showContent ? 'fade-out' : ''}`}>
            <img src="/brand/logo-2.svg" alt="Bisman ERP Solutions" className="splash-bisman-logo" />
          </div>
          <h2 className={`splash-title-heading ${!showContent ? 'fade-out' : ''}`}>
            <span className="splash-typing-text">
              {displayedText.split('').map((char, index) => {
                const isYellowPart = phase === 'done' && index >= 13;
                return (
                  <span key={index} className={isYellowPart ? 'splash-for-you-text' : 'splash-designed-text'}>
                    {char}
                  </span>
                );
              })}
            </span>
            {phase !== 'done' && <span className="splash-typing-cursor"></span>}
          </h2>
        </div>
      </section>
    </div>
  );
}
