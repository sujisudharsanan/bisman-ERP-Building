'use client';

/**
 * Layout Provider - Global state management for layout registry
 * Uses React Context for global accessibility
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  LayoutRegistry,
  ElementBounds,
  PageLayout,
  registerElement as registerElementUtil,
  removeElement as removeElementUtil,
  findFreeSpot,
  validateElementPosition,
  getPageElements,
  clearPage as clearPageUtil,
  updatePageSettings as updatePageSettingsUtil,
  getPageBounds,
  getSuggestedPositions,
} from '@/lib/layoutRegistry';

interface LayoutContextValue {
  registry: LayoutRegistry;
  
  // Element operations
  registerElement: (pageId: string, element: ElementBounds, autoPosition?: boolean) => ElementBounds;
  updateElement: (pageId: string, elementId: string, updates: Partial<ElementBounds>) => void;
  removeElement: (pageId: string, elementId: string) => void;
  
  // Page operations
  getElements: (pageId: string) => ElementBounds[];
  clearPage: (pageId: string) => void;
  updatePageSettings: (pageId: string, settings: Partial<PageLayout>) => void;
  
  // Validation & utilities
  validatePosition: (
    pageId: string,
    element: ElementBounds,
    options?: { excludeId?: string }
  ) => { valid: boolean; overlaps: ElementBounds[]; message?: string };
  
  findFreePosition: (
    pageId: string,
    element: ElementBounds,
    options?: { preferredDirection?: 'down' | 'right' | 'diagonal' }
  ) => ElementBounds;
  
  getSuggestions: (
    pageId: string,
    referenceElement: ElementBounds,
    newElementSize: { width: number; height: number }
  ) => Array<{ x: number; y: number; direction: string; isFree: boolean }>;
  
  // Debug mode
  debugMode: boolean;
  setDebugMode: (enabled: boolean) => void;
  
  // Page info
  getPageBoundingBox: (pageId: string) => {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
  } | null;
}

const LayoutContext = createContext<LayoutContextValue | undefined>(undefined);

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [registry, setRegistry] = useState<LayoutRegistry>({});
  const [debugMode, setDebugMode] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('layoutRegistry');
      if (saved) {
        const parsed = JSON.parse(saved);
        setRegistry(parsed);
        console.log('📦 Loaded layout registry from localStorage:', Object.keys(parsed));
      }
    } catch (error) {
      console.error('Failed to load layout registry:', error);
    }
  }, []);

  // Save to localStorage on changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem('layoutRegistry', JSON.stringify(registry));
        console.log('💾 Saved layout registry to localStorage');
      } catch (error) {
        console.error('Failed to save layout registry:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [registry]);

  // Register or update element with optional auto-positioning
  const registerElement = useCallback(
    (pageId: string, element: ElementBounds, autoPosition = false): ElementBounds => {
      let finalElement = element;

      if (autoPosition) {
        // Check for overlaps and find free spot if needed
        const validation = validateElementPosition(pageId, element, registry, {
          excludeId: element.id,
        });

        if (!validation.valid) {
          console.log(
            `🔄 Element "${element.id}" overlaps with ${validation.overlaps.length} element(s), finding free spot...`
          );
          finalElement = findFreeSpot(pageId, element, registry);
          console.log(
            `✅ Repositioned element "${element.id}" to (${finalElement.x}, ${finalElement.y})`
          );
        }
      }

      setRegistry((prev) => registerElementUtil(pageId, finalElement, prev));
      return finalElement;
    },
    [registry]
  );

  // Update existing element
  const updateElement = useCallback(
    (pageId: string, elementId: string, updates: Partial<ElementBounds>) => {
      setRegistry((prev) => {
        const page = prev[pageId];
        if (!page) return prev;

        const elementIndex = page.elements.findIndex((e) => e.id === elementId);
        if (elementIndex === -1) return prev;

        const updatedElement = { ...page.elements[elementIndex], ...updates };
        const newRegistry = { ...prev };
        newRegistry[pageId].elements[elementIndex] = updatedElement;

        return newRegistry;
      });
    },
    []
  );

  // Remove element
  const removeElement = useCallback((pageId: string, elementId: string) => {
    setRegistry((prev) => removeElementUtil(pageId, elementId, prev));
    console.log(`🗑️ Removed element "${elementId}" from page "${pageId}"`);
  }, []);

  // Get elements for a page
  const getElements = useCallback(
    (pageId: string) => {
      return getPageElements(pageId, registry);
    },
    [registry]
  );

  // Clear all elements from a page
  const clearPage = useCallback((pageId: string) => {
    setRegistry((prev) => clearPageUtil(pageId, prev));
    console.log(`🧹 Cleared all elements from page "${pageId}"`);
  }, []);

  // Update page settings
  const updatePageSettings = useCallback(
    (pageId: string, settings: Partial<PageLayout>) => {
      setRegistry((prev) => updatePageSettingsUtil(pageId, settings, prev));
      console.log(`⚙️ Updated settings for page "${pageId}":`, settings);
    },
    []
  );

  // Validate element position
  const validatePosition = useCallback(
    (
      pageId: string,
      element: ElementBounds,
      options?: { excludeId?: string }
    ) => {
      return validateElementPosition(pageId, element, registry, options);
    },
    [registry]
  );

  // Find free position for element
  const findFreePosition = useCallback(
    (
      pageId: string,
      element: ElementBounds,
      options?: { preferredDirection?: 'down' | 'right' | 'diagonal' }
    ) => {
      return findFreeSpot(pageId, element, registry, options);
    },
    [registry]
  );

  // Get suggested positions
  const getSuggestions = useCallback(
    (
      pageId: string,
      referenceElement: ElementBounds,
      newElementSize: { width: number; height: number }
    ) => {
      return getSuggestedPositions(pageId, referenceElement, newElementSize, registry);
    },
    [registry]
  );

  // Get page bounding box
  const getPageBoundingBox = useCallback(
    (pageId: string) => {
      return getPageBounds(pageId, registry);
    },
    [registry]
  );

  const value: LayoutContextValue = {
    registry,
    registerElement,
    updateElement,
    removeElement,
    getElements,
    clearPage,
    updatePageSettings,
    validatePosition,
    findFreePosition,
    getSuggestions,
    debugMode,
    setDebugMode,
    getPageBoundingBox,
  };

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
}

// Hook for a specific page
export function usePageLayout(pageId: string) {
  const context = useLayout();

  return {
    elements: context.getElements(pageId),
    registerElement: (element: ElementBounds, autoPosition = true) =>
      context.registerElement(pageId, element, autoPosition),
    updateElement: (elementId: string, updates: Partial<ElementBounds>) =>
      context.updateElement(pageId, elementId, updates),
    removeElement: (elementId: string) => context.removeElement(pageId, elementId),
    clearPage: () => context.clearPage(pageId),
    validatePosition: (element: ElementBounds, options?: { excludeId?: string }) =>
      context.validatePosition(pageId, element, options),
    findFreePosition: (
      element: ElementBounds,
      options?: { preferredDirection?: 'down' | 'right' | 'diagonal' }
    ) => context.findFreePosition(pageId, element, options),
    getSuggestions: (
      referenceElement: ElementBounds,
      newElementSize: { width: number; height: number }
    ) => context.getSuggestions(pageId, referenceElement, newElementSize),
    updateSettings: (settings: Partial<PageLayout>) =>
      context.updatePageSettings(pageId, settings),
    getBoundingBox: () => context.getPageBoundingBox(pageId),
    debugMode: context.debugMode,
    setDebugMode: context.setDebugMode,
  };
}
