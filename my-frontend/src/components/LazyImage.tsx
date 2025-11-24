/**
 * LazyImage Component
 * Implements Intersection Observer API for lazy loading
 * 
 * Features:
 * - Loads images only when visible in viewport
 * - Reduces initial page load time
 * - Skeleton placeholder during load
 * - Fade-in animation on load
 * 
 * Usage:
 *   <LazyImage src="/images/large-image.jpg" alt="Description" />
 */

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  /** Placeholder image (low-res or blur) */
  placeholder?: string;
  /** Root margin for Intersection Observer (e.g., "200px") */
  rootMargin?: string;
  /** Threshold for Intersection Observer (0-1) */
  threshold?: number;
  /** Fade animation duration in ms */
  fadeInDuration?: number;
  /** Show skeleton during load */
  showSkeleton?: boolean;
  /** Callback when image enters viewport */
  onVisible?: () => void;
  /** Callback when image loads */
  onLoad?: () => void;
}

/**
 * LazyImage Component
 * Uses Intersection Observer for efficient lazy loading
 */
export function LazyImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder,
  rootMargin = '200px',
  threshold = 0.1,
  fadeInDuration = 300,
  showSkeleton = true,
  onVisible,
  onLoad
}: LazyImageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);

  /**
   * Setup Intersection Observer
   */
  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isVisible) {
            setIsVisible(true);
            if (onVisible) {
              onVisible();
            }
            // Disconnect after becoming visible
            observer.disconnect();
          }
        });
      },
      {
        rootMargin,
        threshold
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [isVisible, rootMargin, threshold, onVisible]);

  /**
   * Handle image load
   */
  const handleLoad = () => {
    setIsLoaded(true);
    if (onLoad) {
      onLoad();
    }
  };

  return (
    <div
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        width: width || '100%',
        height: height || 'auto',
        minHeight: height ? `${height}px` : '200px'
      }}
    >
      {/* Skeleton loader */}
      {showSkeleton && !isLoaded && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}

      {/* Placeholder image (low quality) */}
      {placeholder && !isVisible && (
        <Image
          src={placeholder}
          alt=""
          fill
          className="blur-sm"
          style={{ objectFit: 'cover' }}
        />
      )}

      {/* Actual image (loaded when visible) */}
      {isVisible && (
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          fill={!width && !height}
          onLoad={handleLoad}
          className={`transition-opacity duration-${fadeInDuration} ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ objectFit: 'cover' }}
          quality={80}
        />
      )}
    </div>
  );
}

/**
 * LazyBackgroundImage Component
 * Lazy loading for background images
 */
interface LazyBackgroundImageProps {
  src: string;
  children?: React.ReactNode;
  className?: string;
  rootMargin?: string;
  overlayOpacity?: number;
}

export function LazyBackgroundImage({
  src,
  children,
  className = '',
  rootMargin = '200px',
  overlayOpacity = 0
}: LazyBackgroundImageProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const bgRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin }
    );

    observer.observe(bgRef.current);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin]);

  return (
    <div
      ref={bgRef}
      className={`relative ${className}`}
    >
      {/* Skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}

      {/* Background image */}
      {isVisible && (
        <>
          <Image
            src={src}
            alt=""
            fill
            onLoad={() => setIsLoaded(true)}
            style={{ objectFit: 'cover' }}
            className={`transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            quality={80}
          />
          
          {/* Overlay */}
          {overlayOpacity > 0 && (
            <div
              className="absolute inset-0 bg-black"
              style={{ opacity: overlayOpacity }}
            />
          )}
        </>
      )}

      {/* Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/**
 * LazyImageGrid Component
 * Efficiently loads grid of images
 */
interface LazyImageGridProps {
  images: Array<{
    src: string;
    alt: string;
    id: string | number;
  }>;
  columns?: number;
  gap?: number;
  onImageClick?: (id: string | number) => void;
}

export function LazyImageGrid({
  images,
  columns = 3,
  gap = 16,
  onImageClick
}: LazyImageGridProps) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`
      }}
    >
      {images.map((image) => (
        <div
          key={image.id}
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => onImageClick?.(image.id)}
        >
          <LazyImage
            src={image.src}
            alt={image.alt}
            className="rounded-lg"
          />
        </div>
      ))}
    </div>
  );
}

export default LazyImage;
