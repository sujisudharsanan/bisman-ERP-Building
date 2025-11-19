/**
 * API Route: /api/health/db
 * Legacy/alternate DB health route. Re-exports the same logic as /api/health/database
 * so UI fallbacks keep working across backend variants.
 */

export { default } from './database';
