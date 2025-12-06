import { clientEnv, serverEnv } from '../lib/env';

/**
 * Unified application configuration surface combining validated env values
 * with derived flags and feature switches. This is safe to import on both
 * server and client; only exposes client-safe values when serialized.
 */
export const appConfig = {
  apiBaseUrl: clientEnv.NEXT_PUBLIC_API_URL || '/api',
  isProduction: serverEnv.NODE_ENV === 'production',
  showConfigPanel: process.env.NEXT_PUBLIC_SHOW_CONFIG === '1',
  strictCspEnabled: process.env.CSP_STRICT === '1',
};

export type AppConfig = typeof appConfig;

/**
 * Provide a serialized subset safe for exposing to the browser (e.g. via a loader).
 */
export function getPublicRuntimeConfig(): Partial<AppConfig> {
  return {
    apiBaseUrl: appConfig.apiBaseUrl,
    showConfigPanel: appConfig.showConfigPanel,
    strictCspEnabled: appConfig.strictCspEnabled,
  };
}

export default appConfig;
