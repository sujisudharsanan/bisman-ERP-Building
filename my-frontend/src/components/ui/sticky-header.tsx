'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface StickyHeaderProps {
  children: React.ReactNode;
  className?: string;
  /** Offset from top when sticky (default: 0) */
  offsetTop?: number;
  /** Show shadow when stuck (default: true) */
  showShadow?: boolean;
  /** Background color when stuck */
  stickyBg?: string;
  /** Z-index when stuck (default: 40) */
  zIndex?: number;
  /** Callback when sticky state changes */
  onStickyChange?: (isSticky: boolean) => void;
}

/**
 * StickyHeader - A header that sticks to the top when scrolling
 * 
 * Usage:
 * <StickyHeader>
 *   <h1>Page Title</h1>
 *   <Breadcrumbs />
 * </StickyHeader>
 */
export function StickyHeader({
  children,
  className,
  offsetTop = 0,
  showShadow = true,
  stickyBg = 'bg-background',
  zIndex = 40,
  onStickyChange
}: StickyHeaderProps) {
  const [isSticky, setIsSticky] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const stuck = !entry.isIntersecting;
        setIsSticky(stuck);
        onStickyChange?.(stuck);
      },
      {
        threshold: 0,
        rootMargin: `-${offsetTop}px 0px 0px 0px`
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [offsetTop, onStickyChange]);

  return (
    <>
      {/* Sentinel element for intersection observer */}
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden="true" />
      
      <div
        ref={headerRef}
        className={cn(
          'sticky transition-all duration-200',
          isSticky && showShadow && 'shadow-md',
          isSticky && stickyBg,
          className
        )}
        style={{
          top: offsetTop,
          zIndex: isSticky ? zIndex : 'auto'
        }}
      >
        {children}
      </div>
    </>
  );
}

/**
 * StickyPageHeader - Pre-styled sticky header for page titles
 */
interface StickyPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
}

export function StickyPageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className
}: StickyPageHeaderProps) {
  return (
    <StickyHeader
      className={cn('px-6 py-4 border-b', className)}
      stickyBg="bg-background/95 backdrop-blur-sm"
    >
      {breadcrumbs && <div className="mb-2">{breadcrumbs}</div>}
      
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </StickyHeader>
  );
}

export default StickyHeader;
