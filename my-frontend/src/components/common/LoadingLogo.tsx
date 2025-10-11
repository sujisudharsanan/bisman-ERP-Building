"use client";

import React from "react";

type LoadingLogoProps = {
  size?: number; // total box size in px
  logoSrc?: string; // optional image src for logo
  logoAlt?: string;
  dotColor?: string; // any CSS color
  dotSize?: number; // px
  speedMs?: number; // animation duration
  className?: string;
};

/**
 * LoadingLogo: centers a logo and orbits a dot from the bottom-left of the logo.
 * - The logo stays fixed at center.
 * - The dot sits at the bottom-left quadrant and spins around the center.
 */
export default function LoadingLogo({
  size = 160,
  logoSrc,
  logoAlt = "Company logo",
  dotColor = "#f5b400", // warm yellow
  dotSize = 16,
  speedMs = 1400,
  className = "",
}: LoadingLogoProps) {
  const box = size;
  const logoSize = Math.round(size * 0.62); // scale logo within box

  // Spinner square that rotates around center; the dot is anchored to its bottom-left corner
  // to achieve an orbit that starts visually near bottom-left area of the logo.
  const spinnerSize = Math.round(size * 0.9);

  return (
    <div
      className={className}
      style={{
        width: box,
        height: box,
        position: "relative",
        display: "inline-block",
      }}
      aria-label="Loading"
      role="status"
    >
      {/* Logo (centered) */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: logoSize,
          height: logoSize,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt={logoAlt}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.06))",
            }}
          />
        ) : (
          // Fallback: simple brand letter mark
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 24,
              background: "#f5b400",
              color: "white",
              fontWeight: 800,
              fontSize: Math.round(logoSize * 0.55),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              userSelect: "none",
            }}
          >
            B
          </div>
        )}
      </div>

      {/* Rotating carrier centered on the logo */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: spinnerSize,
          height: spinnerSize,
          transform: "translate(-50%, -50%)",
          animation: `bisman-spin ${speedMs}ms linear infinite`,
          willChange: "transform",
        }}
      >
        {/* Dot anchored at bottom-left corner of the rotating square */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: "100%",
            transform: "translate(-50%, -50%)",
            width: dotSize,
            height: dotSize,
            borderRadius: "9999px",
            background: dotColor,
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}
        />
      </div>

      {/* Inline keyframes to avoid external CSS dependency */}
      <style jsx>{`
        @keyframes bisman-spin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
