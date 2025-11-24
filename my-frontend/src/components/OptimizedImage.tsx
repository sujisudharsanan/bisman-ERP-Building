/**
 * OptimizedImage Component
 * Drop-in replacement for Next.js Image with enhanced optimization
 * 
 * Features:
 * - Automatic WebP/AVIF support with fallbacks
 * - Responsive image variants
 * - Blur placeholder
 * - Error handling with fallback
 * - Loading states
 * 
 * Usage:
 *   <OptimizedImage src="/brand/logo.png" alt="Logo" width={200} height={100} />
 */

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';

interface OptimizedImageProps extends Omit<ImageProps, 'onError' | 'onLoad'> {
  /** Fallback image URL if main image fails to load */
  fallbackSrc?: string;
  /** Show loading skeleton */
  showSkeleton?: boolean;
  /** Custom error handler */
  onError?: (error: Error) => void;
  /** Custom load handler */
  onLoad?: () => void;
}

/**
 * OptimizedImage Component
 * Wrapper around Next.js Image with enhanced features
 */
export function OptimizedImage({
  src,
  alt,
  fallbackSrc = '/images/placeholder.png',
  showSkeleton = true,
  onError,
  onLoad,
  className = '',
  ...props
}: OptimizedImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  /**
   * Handle image load error
   */
  const handleError = () => {
    console.warn(`Failed to load image: ${imgSrc}`);
    
    // Try fallback if not already using it
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    } else {
      setHasError(true);
    }
    
    if (onError) {
      onError(new Error(`Failed to load image: ${src}`));
    }
  };

  /**
   * Handle successful load
   */
  const handleLoad = () => {
    setIsLoading(false);
    if (onLoad) {
      onLoad();
    }
  };

  // Show error state
  if (hasError) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-200 dark:bg-gray-700 ${className}`}
        style={{ 
          width: props.width || '100%', 
          height: props.height || 'auto',
          minHeight: '100px' 
        }}
      >
        <div className="text-center p-4">
          <svg
            className="w-12 h-12 mx-auto text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="text-sm text-gray-500 mt-2">Image not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${isLoading && showSkeleton ? 'animate-pulse' : ''}`}>
      {/* Loading skeleton */}
      {isLoading && showSkeleton && (
        <div
          className="absolute inset-0 bg-gray-200 dark:bg-gray-700 rounded"
          style={{ zIndex: 1 }}
        />
      )}
      
      {/* Optimized Image */}
      <Image
        {...props}
        src={imgSrc}
        alt={alt}
        className={className}
        onError={handleError}
        onLoad={handleLoad}
        // Next.js automatically serves WebP/AVIF if browser supports
        quality={props.quality || 80}
        placeholder={props.placeholder || 'blur'}
        blurDataURL={
          props.blurDataURL ||
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
        }
      />
    </div>
  );
}

/**
 * Responsive Image Component
 * Automatically selects appropriate size variant
 */
interface ResponsiveImageProps extends OptimizedImageProps {
  /** Responsive size breakpoints */
  sizes?: string;
}

export function ResponsiveImage({
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  ...props
}: ResponsiveImageProps) {
  return <OptimizedImage {...props} sizes={sizes} />;
}

/**
 * Avatar Image Component
 * Optimized for user avatars with fallback to initials
 */
interface AvatarImageProps extends Omit<OptimizedImageProps, 'width' | 'height'> {
  /** Avatar size in pixels */
  size?: number;
  /** User name for initials fallback */
  userName?: string;
  /** Background color for initials */
  bgColor?: string;
}

export function AvatarImage({
  src,
  alt,
  size = 40,
  userName,
  bgColor,
  className = '',
  ...props
}: AvatarImageProps) {
  const [hasError, setHasError] = useState(false);

  /**
   * Generate initials from name
   */
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  /**
   * Generate avatar color from name
   */
  const getAvatarColor = (name: string): string => {
    if (bgColor) return bgColor;
    
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-yellow-500',
      'bg-red-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500'
    ];
    
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  // Show initials if image failed or no src
  if (!src || hasError) {
    const initials = userName ? getInitials(userName) : '?';
    const bgColorClass = userName ? getAvatarColor(userName) : 'bg-gray-400';
    
    return (
      <div
        className={`flex items-center justify-center rounded-full text-white font-semibold ${bgColorClass} ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {initials}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}

/**
 * Background Image Component
 * Optimized for full-width backgrounds
 */
interface BackgroundImageProps extends Omit<OptimizedImageProps, 'fill'> {
  /** Overlay opacity (0-1) */
  overlayOpacity?: number;
  /** Overlay color */
  overlayColor?: string;
  /** Content to display over background */
  children?: React.ReactNode;
}

export function BackgroundImage({
  src,
  alt,
  overlayOpacity = 0,
  overlayColor = 'black',
  children,
  className = '',
  ...props
}: BackgroundImageProps) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        style={{ objectFit: 'cover' }}
        {...props}
      />
      
      {overlayOpacity > 0 && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: overlayColor,
            opacity: overlayOpacity
          }}
        />
      )}
      
      {children && (
        <div className="relative z-10">
          {children}
        </div>
      )}
    </div>
  );
}

export default OptimizedImage;
