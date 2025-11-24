/**
 * Crash-proof Icon Mapping Utility
 * 
 * This utility provides a safe way to dynamically render Lucide React icons
 * without causing "Element type is invalid" errors during build/prerendering.
 * 
 * Features:
 * - Automatic fallback to Home icon for undefined icons
 * - Proxy-based dynamic access
 * - Type-safe icon rendering
 * - Production-ready with zero crashes
 */

import React from 'react';
import * as Icons from 'lucide-react';
import { Home } from 'lucide-react';

// Type for icon component
type IconComponent = React.ComponentType<any>;

// Fallback icon when requested icon doesn't exist
const FallbackIcon: IconComponent = Home;

/**
 * Safe icon map with automatic fallback
 * Uses Proxy to intercept undefined icon access
 */
export const iconMap = new Proxy(Icons as any, {
  get(target: any, prop: string): IconComponent {
    // Return the icon if it exists, otherwise return fallback
    return target[prop] || FallbackIcon;
  }
});

/**
 * Get an icon component by name with fallback
 * @param iconName - Name of the Lucide icon
 * @returns Icon component (never undefined)
 */
export function getIcon(iconName: string): IconComponent {
  return iconMap[iconName] || FallbackIcon;
}

/**
 * Check if an icon exists in Lucide React
 * @param iconName - Name of the icon to check
 * @returns true if icon exists
 */
export function hasIcon(iconName: string): boolean {
  return iconName in Icons;
}

export default iconMap;
