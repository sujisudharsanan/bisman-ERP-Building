import { useTranslation as useNextTranslation } from 'next-i18next';

/**
 * Custom hook for translations following international standards
 * @returns Translation function and i18n instance
 */
export const useTranslation = (namespace: string = 'common') => {
  return useNextTranslation(namespace);
};

/**
 * Translation function type for consistency
 */
export type TranslationFunction = (key: string, options?: Record<string, any>) => string;
