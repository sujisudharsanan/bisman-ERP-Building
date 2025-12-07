/**
 * Fallback & Recovery Page
 * Route: /super-admin/fallback-recovery
 * 
 * SuperAdmin area for investigating failures, rolling back to safety,
 * and restoring system stability.
 */

'use client';

import React from 'react';
import { FallbackRecoveryPage } from '@/modules/system/components/fallback-recovery';

export default function FallbackRecoveryRoute() {
  return <FallbackRecoveryPage />;
}
