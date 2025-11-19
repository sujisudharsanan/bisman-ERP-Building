/**
 * ============================================================================
 * SECURE FILE URL UTILITY
 * ============================================================================
 * 
 * Purpose: Convert legacy /uploads/ URLs to secure /api/secure-files/ URLs
 * Security: Ensures all file access goes through authenticated endpoint
 * 
 * Usage:
 * ```typescript
 * import { convertToSecureUrl, getSecureFileUrl } from '@/utils/secureFileUrl';
 * 
 * // Convert existing URL
 * const secureUrl = convertToSecureUrl('/uploads/profile_pics/avatar.jpg');
 * // Returns: '/api/secure-files/profile_pics/avatar.jpg'
 * 
 * // Build secure URL from components
 * const url = getSecureFileUrl('profile_pics', 'avatar.jpg');
 * // Returns: '/api/secure-files/profile_pics/avatar.jpg'
 * ```
 * ============================================================================
 */

/**
 * Convert legacy /uploads/ URL to secure /api/secure-files/ URL
 * @param url - URL that may contain /uploads/
 * @returns Converted secure URL
 */
export function convertToSecureUrl(url: string | undefined | null): string {
  if (!url) return '';
  
  // Already a secure URL
  if (url.includes('/api/secure-files/')) {
    return url;
  }
  
  // Convert /uploads/ to /api/secure-files/
  if (url.includes('/uploads/')) {
    return url.replace('/uploads/', '/api/secure-files/');
  }
  
  // Return as-is if no conversion needed
  return url;
}

/**
 * Build secure file URL from category and filename
 * @param category - File category (e.g., 'profile_pics', 'documents', 'attachments')
 * @param filename - Filename
 * @returns Full secure URL path
 */
export function getSecureFileUrl(category: string, filename: string): string {
  if (!category || !filename) return '';
  return `/api/secure-files/${category}/${filename}`;
}

/**
 * Extract filename from any file URL
 * @param url - Full URL or path
 * @returns Filename only
 */
export function extractFilename(url: string | undefined | null): string {
  if (!url) return '';
  const parts = url.split('/');
  return parts[parts.length - 1] || '';
}

/**
 * Extract category from secure file URL
 * @param url - Secure file URL
 * @returns Category name or empty string
 */
export function extractCategory(url: string | undefined | null): string {
  if (!url) return '';
  
  // Match pattern: /api/secure-files/{category}/{filename}
  const match = url.match(/\/api\/secure-files\/([^/]+)\//);
  return match ? match[1] : '';
}

/**
 * Check if URL is a secure file URL
 * @param url - URL to check
 * @returns True if URL uses secure endpoint
 */
export function isSecureFileUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.includes('/api/secure-files/');
}

/**
 * Check if URL is a legacy uploads URL (needs conversion)
 * @param url - URL to check
 * @returns True if URL uses old /uploads/ path
 */
export function isLegacyUploadsUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.includes('/uploads/') && !url.includes('/api/secure-files/');
}

/**
 * Get full URL with base URL
 * @param path - Relative path
 * @param baseUrl - Base URL (from env or config)
 * @returns Full URL
 */
export function getFullFileUrl(path: string, baseUrl?: string): string {
  if (!path) return '';
  
  // Already absolute URL
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Convert to secure URL first if needed
  const securePath = convertToSecureUrl(path);
  
  // Add base URL if provided
  if (baseUrl) {
    return `${baseUrl.replace(/\/$/, '')}${securePath}`;
  }
  
  return securePath;
}

/**
 * Validate file category
 * @param category - Category to validate
 * @returns True if category is allowed
 */
export function isValidCategory(category: string): boolean {
  const allowedCategories = ['profile_pics', 'documents', 'attachments'];
  return allowedCategories.includes(category);
}

/**
 * React hook for secure file URLs
 * @param url - Original URL
 * @returns Secure URL
 */
export function useSecureFileUrl(url: string | undefined | null): string {
  return convertToSecureUrl(url);
}

// Default export for convenience
export default {
  convertToSecureUrl,
  getSecureFileUrl,
  extractFilename,
  extractCategory,
  isSecureFileUrl,
  isLegacyUploadsUrl,
  getFullFileUrl,
  isValidCategory,
  useSecureFileUrl,
};
