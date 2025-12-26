'use client';

/**
 * BISMAN ERP - Unlock Prompt Context Provider
 * 
 * Global context for managing micro-unlock prompts throughout the application.
 * When API calls return MICRO_UNLOCK_REQUIRED errors, this provider
 * intercepts them and displays the unlock modal.
 * 
 * @module contexts/UnlockPromptContext
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Lazy load the UnlockPrompt component
const UnlockPrompt = dynamic(
  () => import('@/components/subscription/UnlockPrompt'),
  { ssr: false }
);

// ============================================================================
// TYPES
// ============================================================================

interface UnlockPromptData {
  featureKey: string;
  featureName: string;
  description?: string;
  currentUsage: number;
  usageLimit: number;
  resetInSeconds: number;
  unlockPrice: number;
  currency?: string;
  unlockEndpoint?: string;
}

interface UnlockPromptContextValue {
  showUnlockPrompt: (data: UnlockPromptData) => void;
  hideUnlockPrompt: () => void;
  isPromptVisible: boolean;
  currentPromptData: UnlockPromptData | null;
  handleApiResponse: <T>(response: Response) => Promise<T>;
}

// ============================================================================
// CONTEXT
// ============================================================================

const UnlockPromptContext = createContext<UnlockPromptContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

interface UnlockPromptProviderProps {
  children: React.ReactNode;
}

export function UnlockPromptProvider({ children }: UnlockPromptProviderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [promptData, setPromptData] = useState<UnlockPromptData | null>(null);

  // Show the unlock prompt modal
  const showUnlockPrompt = useCallback((data: UnlockPromptData) => {
    setPromptData(data);
    setIsVisible(true);
  }, []);

  // Hide the unlock prompt modal
  const hideUnlockPrompt = useCallback(() => {
    setIsVisible(false);
    // Clear data after animation
    setTimeout(() => setPromptData(null), 300);
  }, []);

  // Handle API response and check for MICRO_UNLOCK_REQUIRED errors
  const handleApiResponse = useCallback(async <T,>(response: Response): Promise<T> => {
    const data = await response.json();

    // Check if this is a micro-unlock required response
    if (
      !data.ok && 
      data.errorCode === 'MICRO_UNLOCK_REQUIRED' && 
      data.unlockPrompt
    ) {
      const prompt = data.unlockPrompt;
      showUnlockPrompt({
        featureKey: data.featureKey,
        featureName: prompt.title || data.featureKey,
        description: prompt.description,
        currentUsage: prompt.currentUsage,
        usageLimit: prompt.usageLimit,
        resetInSeconds: prompt.resetInSeconds,
        unlockPrice: prompt.price,
        currency: prompt.currency || 'INR',
        unlockEndpoint: prompt.actions?.find(
          (a: { id: string }) => a.id === 'unlock'
        )?.endpoint
      });

      // Throw a specific error that can be caught
      const error = new Error(data.message || 'Feature unlock required');
      (error as Error & { code: string }).code = 'MICRO_UNLOCK_REQUIRED';
      throw error;
    }

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data as T;
  }, [showUnlockPrompt]);

  // Global fetch interceptor for automatic unlock prompt handling
  useEffect(() => {
    // Store original fetch
    const originalFetch = window.fetch;

    // Override fetch to intercept micro-unlock responses
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Clone response so we can read it without consuming
      const clonedResponse = response.clone();
      
      try {
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const data = await clonedResponse.json();
          
          // Check for micro-unlock required
          if (
            data.ok === false && 
            data.errorCode === 'MICRO_UNLOCK_REQUIRED' && 
            data.unlockPrompt
          ) {
            const prompt = data.unlockPrompt;
            showUnlockPrompt({
              featureKey: data.featureKey,
              featureName: prompt.title || data.featureKey,
              description: prompt.description,
              currentUsage: prompt.currentUsage,
              usageLimit: prompt.usageLimit,
              resetInSeconds: prompt.resetInSeconds,
              unlockPrice: prompt.price,
              currency: prompt.currency || 'INR',
              unlockEndpoint: prompt.actions?.find(
                (a: { id: string }) => a.id === 'unlock'
              )?.endpoint
            });
          }
        }
      } catch {
        // Ignore JSON parse errors for non-JSON responses
      }
      
      return response;
    };

    // Cleanup: restore original fetch
    return () => {
      window.fetch = originalFetch;
    };
  }, [showUnlockPrompt]);

  // Handle successful unlock
  const handleUnlockSuccess = useCallback(() => {
    hideUnlockPrompt();
    // Optionally trigger a page refresh or re-fetch
    // Could emit an event here for components to listen to
  }, [hideUnlockPrompt]);

  const contextValue: UnlockPromptContextValue = {
    showUnlockPrompt,
    hideUnlockPrompt,
    isPromptVisible: isVisible,
    currentPromptData: promptData,
    handleApiResponse
  };

  return (
    <UnlockPromptContext.Provider value={contextValue}>
      {children}
      
      {/* Render the UnlockPrompt modal */}
      {promptData && (
        <UnlockPrompt
          isOpen={isVisible}
          onClose={hideUnlockPrompt}
          onUnlockSuccess={handleUnlockSuccess}
          featureKey={promptData.featureKey}
          featureName={promptData.featureName}
          description={promptData.description}
          currentUsage={promptData.currentUsage}
          usageLimit={promptData.usageLimit}
          resetInSeconds={promptData.resetInSeconds}
          unlockPrice={promptData.unlockPrice}
          currency={promptData.currency}
        />
      )}
    </UnlockPromptContext.Provider>
  );
}

// ============================================================================
// HOOK
// ============================================================================

export function useUnlockPrompt(): UnlockPromptContextValue {
  const context = useContext(UnlockPromptContext);
  
  if (context === undefined) {
    throw new Error('useUnlockPrompt must be used within an UnlockPromptProvider');
  }
  
  return context;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if an error is a micro-unlock required error
 */
export function isMicroUnlockError(error: unknown): boolean {
  return (
    error instanceof Error && 
    (error as Error & { code?: string }).code === 'MICRO_UNLOCK_REQUIRED'
  );
}

/**
 * Format reset time for display
 */
export function formatResetTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} seconds`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? '' : 's'}`;
  }
  
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

export default UnlockPromptContext;
