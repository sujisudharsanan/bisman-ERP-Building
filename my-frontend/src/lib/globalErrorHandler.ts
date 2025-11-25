/**
 * ============================================================================
 * GLOBAL ERROR HANDLER
 * ============================================================================
 * 
 * Centralized error display logic
 * Creates and manages error toast notifications
 */

import { type APIErrorResponse } from './errorCodes';

// Event emitter for error notifications
type ErrorListener = (error: APIErrorResponse) => void;
const errorListeners: ErrorListener[] = [];

/**
 * Subscribe to error events
 */
export function onGlobalError(listener: ErrorListener): () => void {
  errorListeners.push(listener);
  
  // Return unsubscribe function
  return () => {
    const index = errorListeners.indexOf(listener);
    if (index > -1) {
      errorListeners.splice(index, 1);
    }
  };
}

/**
 * Show global error notification
 * This function is called by axios interceptor
 */
export function showGlobalError(error: APIErrorResponse): void {
  // Emit to all listeners
  errorListeners.forEach(listener => {
    try {
      listener(error);
    } catch (err) {
      console.error('Error in global error listener:', err);
    }
  });
}

/**
 * Clear all error listeners
 */
export function clearErrorListeners(): void {
  errorListeners.length = 0;
}
