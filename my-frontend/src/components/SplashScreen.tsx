"use client";

import React, { useEffect, useState, useRef } from 'react';

interface SplashScreenProps {
  onComplete?: () => void;
  duration?: number;
  clientLogo?: string;
  clientName?: string;
}

// Get client/company name from localStorage (for personalized welcome)
function getClientName(): string {
  if (typeof window === 'undefined') return '';
  try {
    // Try multiple sources for client name
    const brandingData = localStorage.getItem('bisman_client_branding');
    if (brandingData) {
      const branding = JSON.parse(brandingData);
      if (branding.name && branding.name.trim() && branding.name !== 'BISMAN') {
        return branding.name.trim();
      }
    }
    // Fallback to direct localStorage values
    const clientName = localStorage.getItem('client_name') || localStorage.getItem('company_name');
    if (clientName && clientName.trim()) {
      return clientName.trim();
    }
  } catch {
    // Ignore localStorage errors
  }
  return '';
}

export default function SplashScreen({
  onComplete,
  duration = 3500,
  clientLogo,
  clientName
}: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [showContent, setShowContent] = useState(true);
  const [displayedText, setDisplayedText] = useState('Designed ');
  const [phase, setPhase] = useState<'typing1' | 'pause' | 'deleting' | 'typing2' | 'done'>('typing1');
  const hasRun = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const [companyName, setCompanyName] = useState('');
  
  // Keep ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Get company name on client side - prioritize prop, then localStorage
  useEffect(() => {
    const storedClientName = getClientName();
    // Use prop first, then stored value
    setCompanyName(clientName || storedClientName || '');
  }, [clientName]);
  
  const prefix = 'Designed ';
  const typePart1 = 'for Genius';
  const deleteWord = 'Genius';
  // Keep "You" in the animation, user name will be shown at bottom
  const typePart2 = 'You';

  useEffect(() => {
    // Prevent re-running if already executed
    if (hasRun.current) return;
    hasRun.current = true;
    
    let timeoutId: NodeJS.Timeout;
    let charIndex = 0;
    let pauseCount = 0;
    
    const typeChar1 = () => {
      if (charIndex < typePart1.length) {
        setDisplayedText(prefix + typePart1.slice(0, charIndex + 1));
        charIndex++;
        timeoutId = setTimeout(typeChar1, 25); // 25ms per char for typing
      } else {
        setPhase('pause');
        pauseCount = 0;
        timeoutId = setTimeout(doPause, 20);
      }
    };
    
    const doPause = () => {
      pauseCount++;
      if (pauseCount >= 10) { // 10 × 20ms = 200ms pause
        setPhase('deleting');
        charIndex = deleteWord.length;
        timeoutId = setTimeout(deleteChar, 30);
      } else {
        timeoutId = setTimeout(doPause, 20);
      }
    };
    
    const deleteChar = () => {
      if (charIndex > 0) {
        charIndex--;
        setDisplayedText(prefix + 'for ' + deleteWord.slice(0, charIndex));
        timeoutId = setTimeout(deleteChar, 30); // 30ms per char for deleting
      } else {
        setPhase('typing2');
        charIndex = 0;
        timeoutId = setTimeout(typeChar2, 30);
      }
    };
    
    const typeChar2 = () => {
      if (charIndex < typePart2.length) {
        setDisplayedText(prefix + 'for ' + typePart2.slice(0, charIndex + 1));
        charIndex++;
        timeoutId = setTimeout(typeChar2, 30); // 30ms per char for "you"
      } else {
        setPhase('done');
        // Start fade out 1.2 seconds after animation completes
        setTimeout(() => {
          setShowContent(false);
        }, 1200);
        // Complete and hide 2.7 seconds after animation completes (1.2s wait + 1.5s fade)
        setTimeout(() => {
          setIsVisible(false);
          onCompleteRef.current?.();
        }, 2700);
      }
    };
    
    // Start typing
    timeoutId = setTimeout(typeChar1, 25);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []); // Empty dependency array - run only once

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
          background: #0f172a;
          overflow: hidden;
        }
        
        .splash-hero-bg::before {
          display: none;
        }
        
        .splash-hero-bg::after {
          display: none;
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
          color: #ffffff;
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
          animation: splashFadeOut 1.5s ease-in-out forwards;
        }
        
        .splash-bisman-logo {
          width: 280px;
          height: auto;
          filter: brightness(0) invert(1);
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
            transform: translateY(0) scale(1);
          }
          50% {
            opacity: 0.6;
            transform: translateY(8px) scale(0.98);
          }
          100% {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
        }
        
        .splash-hero-bg.fade-out {
          animation: splashBgFadeOut 1.5s ease-in-out forwards;
        }
        
        @keyframes splashBgFadeOut {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 0; }
        }
        
        .splash-title-heading {
          font-size: 2.25rem;
          font-weight: 600;
          margin-bottom: 1rem;
          line-height: 1.3;
        }
        
        .splash-title-heading.fade-out {
          animation: splashFadeOut 1.5s ease-in-out forwards;
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
          background-color: #fbbf24;
          margin-left: 2px;
          animation: splashBlink 0.7s infinite;
          vertical-align: text-bottom;
        }
        
        @keyframes splashBlink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        
        .splash-designed-text {
          color: #94a3b8;
        }
        
        .splash-for-you-text {
          color: #fbbf24;
        }
        
        .splash-client-branding {
          margin-top: 1.5rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          animation: splashFadeIn 2s ease-out 0.5s both;
        }
        
        .splash-client-branding.fade-out {
          animation: splashFadeOut 1.5s ease-in-out forwards;
        }
        
        .splash-client-logo {
          width: 80px;
          height: 80px;
          object-fit: contain;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.1);
          padding: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }
        
        @media (min-width: 768px) {
          .splash-client-logo {
            width: 100px;
            height: 100px;
          }
        }
        
        .splash-client-name {
          font-size: 1rem;
          font-weight: 500;
          color: #94a3b8;
          margin-top: 0.25rem;
        }
        
        .splash-powered-by {
          font-size: 0.75rem;
          color: #64748b;
          margin-top: 0.5rem;
        }
        
        .splash-powered-section {
          position: fixed;
          bottom: 2rem;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 1rem;
          animation: splashFadeIn 2s ease-out 1s both;
          z-index: 20;
        }
        
        .splash-powered-section.fade-out {
          animation: splashFadeOut 1.5s ease-in-out forwards;
        }
        
        .splash-powered-text {
          color: #94a3b8;
          font-weight: 400;
        }
        
        .splash-user-name {
          color: #fbbf24;
          font-weight: 600;
        }
      `}</style>

      <section className="splash-hero-section">
        <div className={`splash-hero-bg ${!showContent ? 'fade-out' : ''}`}></div>
        
        <div className="splash-hero-content">
          {/* Main branding - client display name or BISMAN as fallback */}
          <div className={`splash-logo-container ${!showContent ? 'fade-out' : ''}`}>
            {clientLogo ? (
              <img src={clientLogo} alt={clientName || 'BISMAN'} className="h-16 md:h-20 object-contain mb-4" />
            ) : null}
            <span className="text-3xl md:text-4xl font-bold text-white tracking-wide">
              {clientName || 'BISMAN'}
            </span>
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
        
        {/* Company Welcome Message - positioned as footer */}
        <div className={`splash-powered-section ${!showContent ? 'fade-out' : ''}`}>
          {companyName ? (
            <>
              <span className="splash-powered-text">Welcome to </span>
              <span className="splash-user-name">{companyName}</span>
            </>
          ) : (
            <span className="splash-powered-text">Welcome</span>
          )}
        </div>
      </section>
    </div>
  );
}
