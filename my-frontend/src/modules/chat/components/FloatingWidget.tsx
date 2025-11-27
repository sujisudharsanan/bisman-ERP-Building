"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

/**
 * Props:
 * - onOpen(): called when widget is clicked (open chat panel)
 * - position: 'bottom-right' | 'bottom-left' (default 'bottom-right')
 * - primaryColor, accentColor: colors used by overlay animations
 * - hasNotification: boolean (persistent unread indicator)
 * - size: diameter of floating button in pixels (default 72)
 */
interface BismanFloatingWidgetProps {
  onOpen?: () => void;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  accentColor?: string;
  hasNotification?: boolean;
  size?: number;
}

export default function BismanFloatingWidget({
  onOpen = () => {},
  position = 'bottom-right',
  primaryColor = '#0A3A63', // Bisman navy
  accentColor = '#FFC20A',  // Bisman yellow
  hasNotification = false,
  size = 72,
}: BismanFloatingWidgetProps) {
  const [hover, setHover] = useState(false);
  const [blink, setBlink] = useState(false);
  const [smile, setSmile] = useState(false);
  const [newPulse, setNewPulse] = useState(false);

  // Auto blink every ~3-5s with realistic timing
  useEffect(() => {
    let t: NodeJS.Timeout;
    function schedule() {
      t = setTimeout(() => {
        setBlink(true);
        // Blink lasts 150ms (realistic human blink duration)
        setTimeout(() => setBlink(false), 150);
        // Schedule next blink in 3-5 seconds
        schedule();
      }, 3000 + Math.random() * 2000);
    }
    schedule();
    return () => clearTimeout(t);
  }, []);

  // Auto smile every ~3-5s (slightly different timing than blink for variety)
  useEffect(() => {
    let t: NodeJS.Timeout;
    function schedule() {
      t = setTimeout(() => {
        setSmile(true);
        setTimeout(() => setSmile(false), 600);
        schedule();
      }, 3500 + Math.random() * 2000);
    }
    schedule();
    return () => clearTimeout(t);
  }, []);

  // Example: if parent toggles hasNotification from false->true you might also want a one-shot pulse
  useEffect(() => {
    if (hasNotification) {
      setNewPulse(true);
      const timer = setTimeout(() => setNewPulse(false), 1100);
      return () => clearTimeout(timer);
    }
  }, [hasNotification]);

  const containerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '999px',
    position: 'fixed',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    right: position === 'bottom-right' ? 20 : 'auto',
    left: position === 'bottom-left' ? 20 : 'auto',
    bottom: 20,
    cursor: 'pointer',
    background: 'transparent',
  };

  // overlay SVG will use a viewBox 0..100 and percentage placement so it scales with the image
  // eye/mouth positions tuned for Bisman chatbot logo
  const eyeLeft = { x: 40, y: 45 };
  const eyeRight = { x: 60, y: 45 };
  const mouthPos = { x: 50, y: 65 };

  return (
    <div style={containerStyle} aria-live="polite" role="button" aria-label="Open Bisman chat">
      {/* Notification glow (persistent) */}
      {hasNotification && (
        <motion.div
          style={{
            position: 'absolute',
            inset: -8,
            borderRadius: '999px',
            pointerEvents: 'none',
          }}
          animate={{ boxShadow: `0 0 16px ${accentColor}` }}
          transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1.6 }}
        />
      )}

      {/* One-shot pulse when new message (expanding ring) */}
      {newPulse && (
        <motion.div
          style={{
            position: 'absolute',
            width: size * 0.9,
            height: size * 0.9,
            borderRadius: '999px',
            border: `2px solid ${accentColor}`,
            pointerEvents: 'none',
          }}
          initial={{ opacity: 0.9, scale: 1 }}
          animate={{ opacity: 0, scale: 1.6 }}
          transition={{ duration: 0.95 }}
        />
      )}

      {/* Main clickable button - contains raster image + svg overlay for eyes/mouth */}
      <motion.div
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={() => onOpen()}
        whileTap={{ scale: 0.98 }}
        initial={false}
        animate={hover ? { scale: 1.06, rotate: [0, -4, 4, -2, 0] } : { scale: 1, rotate: 0 }}
        transition={{ duration: 0.35, rotate: { type: 'tween' } }}
        className="rounded-full overflow-hidden relative bg-white dark:bg-[#071018]"
        style={{ width: size, height: size, borderRadius: '999px', overflow: 'visible', position: 'relative' }}
      >
        {/* base avatar image */}
        <img
          src="/brand/spark-assistant-avatar.png"
          alt="Bisman chatbot"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '999px',
            display: 'block',
            pointerEvents: 'none',
          }}
          draggable={false}
        />

        {/* SVG overlay for eyes and mouth (vector animations) */}
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid meet"
          style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          {/* subtle ring behind avatar when hasNotification */}
          <motion.circle
            cx="50"
            cy="50"
            r="48"
            fill="none"
            stroke={hasNotification ? accentColor : 'transparent'}
            strokeWidth="4"
            initial={{ opacity: 0 }}
            animate={hasNotification ? { opacity: [0.2, 0.9, 0.2] } : { opacity: 0 }}
            transition={hasNotification ? { repeat: Infinity, duration: 1.6 } : { duration: 0 }}
          />

          {/* left eye with realistic human-like blink (top to bottom eyelid) */}
          <g transform={`translate(${eyeLeft.x},${eyeLeft.y})`}>
            {/* Eye pupil */}
            <motion.circle 
              cx="0" 
              cy="0" 
              r="2.5" 
              fill={primaryColor}
              animate={
                hover
                  ? { x: [-0.5, 1, -0.5, 0], y: [0, -0.5, 0.5, 0] }
                  : { x: 0, y: 0 }
              }
              transition={{ duration: 0.28 }}
            />
            {/* Pupil center (darker) */}
            <circle cx="0" cy="0" r="1.4" fill="rgba(0,0,0,0.5)" />
            {/* Upper eyelid - smaller, curved shape that moves down from top when blinking */}
            <motion.ellipse
              cx="0"
              cy="0"
              rx="3.8"
              ry="3.5"
              fill="white"
              opacity="0.98"
              initial={{ y: -7 }}
              animate={
                blink
                  ? { y: 0 }
                  : { y: -7 }
              }
              transition={{ 
                duration: 0.1,
                ease: [0.4, 0, 0.2, 1]
              }}
            />
            {/* Light reflection for realism */}
            <circle cx="-1" cy="-1" r="0.8" fill="white" opacity="0.7" />
            <circle cx="0.8" cy="0.6" r="0.4" fill="white" opacity="0.4" />
          </g>

          {/* right eye with realistic human-like blink (top to bottom eyelid) */}
          <g transform={`translate(${eyeRight.x},${eyeRight.y})`}>
            {/* Eye pupil */}
            <motion.circle 
              cx="0" 
              cy="0" 
              r="2.5" 
              fill={primaryColor}
              animate={
                hover
                  ? { x: [0.5, -1, 0.5, 0], y: [0, -0.5, 0.5, 0] }
                  : { x: 0, y: 0 }
              }
              transition={{ duration: 0.28 }}
            />
            {/* Pupil center (darker) */}
            <circle cx="0" cy="0" r="1.4" fill="rgba(0,0,0,0.5)" />
            {/* Upper eyelid - smaller, curved shape that moves down from top when blinking */}
            <motion.ellipse
              cx="0"
              cy="0"
              rx="3.8"
              ry="3.5"
              fill="white"
              opacity="0.98"
              initial={{ y: -7 }}
              animate={
                blink
                  ? { y: 0 }
                  : { y: -7 }
              }
              transition={{ 
                duration: 0.1,
                ease: [0.4, 0, 0.2, 1],
                delay: 0.03
              }}
            />
            {/* Light reflection for realism */}
            <circle cx="-1" cy="-1" r="0.8" fill="white" opacity="0.7" />
            <circle cx="0.8" cy="0.6" r="0.4" fill="white" opacity="0.4" />
          </g>

          {/* Smiling mouth with animation */}
          <g transform={`translate(${mouthPos.x},${mouthPos.y})`}>
            <motion.path
              d="M -10 0 Q 0 8 10 0"
              stroke="black"
              strokeWidth="3"
              fill="none"
              strokeLinecap="butt"
              animate={{ 
                scaleY: hover || smile ? 1.2 : 1,
                d: smile 
                  ? "M -10 0 Q 0 10 10 0"  // Bigger smile
                  : "M -10 0 Q 0 8 10 0",   // Normal smile
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
            {/* White curved line in center when smiling (open mouth effect) */}
            <motion.path
              d="M -4 5 Q 0 7 4 5"
              stroke="white"
              strokeWidth="2"
              fill="none"
              strokeLinecap="butt"
              animate={{ 
                opacity: smile || hover ? 0.95 : 0,
                strokeWidth: smile || hover ? 2.5 : 2,
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          </g>
        </svg>
      </motion.div>
    </div>
  );
}
