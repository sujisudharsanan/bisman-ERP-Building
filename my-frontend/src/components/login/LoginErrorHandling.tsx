/**
 * ============================================================================
 * LOGIN PAGE ERROR HANDLING ENHANCEMENTS
 * ============================================================================
 * 
 * Add these enhancements to your login page to handle rate limiting
 * and display user-friendly error messages
 */

import { useState, useEffect } from 'react';
import { isAPIError, getErrorMessage, type APIErrorResponse } from '@/lib/errorCodes';
import { AlertCircle, Clock } from 'lucide-react';

/**
 * Rate Limit Error Display Component
 * Shows when user exceeds login attempts
 */
interface RateLimitErrorProps {
  error: APIErrorResponse;
  retryAfter: number;
}

export function RateLimitError({ error, retryAfter }: RateLimitErrorProps) {
  const [timeLeft, setTimeLeft] = useState(retryAfter);
  
  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft]);
  
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  return (
    <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 mb-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">
            Too Many Login Attempts
          </h3>
          <p className="text-sm text-red-700 dark:text-red-300 mb-3">
            {getErrorMessage(error.errorCode)}
          </p>
          
          {timeLeft > 0 ? (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="font-mono font-semibold text-red-800 dark:text-red-200">
                {minutes}:{seconds.toString().padStart(2, '0')}
              </span>
              <span className="text-red-700 dark:text-red-300">
                until you can try again
              </span>
            </div>
          ) : (
            <p className="text-sm font-semibold text-green-600 dark:text-green-400">
              ✓ You can try logging in again now
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Generic Error Display Component
 * Shows for other error types
 */
interface ErrorAlertProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4 mb-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-200">
            {message}
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
            aria-label="Dismiss"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Enhanced Login Error Handling Hook
 * Use this in your login page
 */
export function useLoginErrorHandling() {
  const [rateLimitError, setRateLimitError] = useState<APIErrorResponse | null>(null);
  const [genericError, setGenericError] = useState<string>('');
  const [loginDisabled, setLoginDisabled] = useState(false);
  
  /**
   * Handle login error from API response
   */
  const handleLoginError = (err: any) => {
    // Check if it's a structured API error
    const errorResponse = err?.response?.data;
    
    if (isAPIError(errorResponse)) {
      // Rate limit error
      if (errorResponse.errorCode === 'LOGIN_LIMIT_REACHED' && errorResponse.retryAfter) {
        setRateLimitError(errorResponse);
        setGenericError('');
        setLoginDisabled(true);
        
        // Auto-enable login button after retry time
        setTimeout(() => {
          setLoginDisabled(false);
        }, errorResponse.retryAfter * 1000);
        
        return;
      }
      
      // Other errors
      setGenericError(getErrorMessage(errorResponse.errorCode));
      setRateLimitError(null);
    } else {
      // Fallback for non-structured errors
      setGenericError(
        err?.response?.data?.message || 
        err?.message || 
        'Login failed. Please try again.'
      );
      setRateLimitError(null);
    }
  };
  
  /**
   * Clear all errors
   */
  const clearErrors = () => {
    setRateLimitError(null);
    setGenericError('');
  };
  
  return {
    rateLimitError,
    genericError,
    loginDisabled,
    handleLoginError,
    clearErrors,
  };
}

/**
 * INTEGRATION EXAMPLE
 * 
 * Add to your login page component:
 * 
 * ```tsx
 * import { useLoginErrorHandling, RateLimitError, ErrorAlert } from '@/components/login/LoginErrorHandling';
 * 
 * export default function LoginPage() {
 *   const { 
 *     rateLimitError, 
 *     genericError, 
 *     loginDisabled, 
 *     handleLoginError, 
 *     clearErrors 
 *   } = useLoginErrorHandling();
 * 
 *   const handleSubmit = async (e: React.FormEvent) => {
 *     e.preventDefault();
 *     clearErrors(); // Clear previous errors
 *     setLoading(true);
 * 
 *     try {
 *       const user = await login(email, password);
 *       // Success logic...
 *     } catch (err) {
 *       handleLoginError(err); // This handles all error types
 *     } finally {
 *       setLoading(false);
 *     }
 *   };
 * 
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       {rateLimitError && (
 *         <RateLimitError 
 *           error={rateLimitError} 
 *           retryAfter={rateLimitError.retryAfter || 900} 
 *         />
 *       )}
 *       
 *       {genericError && (
 *         <ErrorAlert 
 *           message={genericError} 
 *           onDismiss={clearErrors} 
 *         />
 *       )}
 *       
 *       // ... rest of form
 *       
 *       <button 
 *         type="submit" 
 *         disabled={loading || loginDisabled}
 *       >
 *         {loginDisabled ? 'Login Disabled' : 'Sign In'}
 *       </button>
 *     </form>
 *   );
 * }
 * ```
 */
