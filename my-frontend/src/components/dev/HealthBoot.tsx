"use client";
import { useEffect } from 'react';
import { runApiHealthCheckOnce } from '@/utils/apiHealth';

export default function HealthBoot() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_HEALTH === '1' || process.env.NODE_ENV !== 'production') {
      runApiHealthCheckOnce();
    }
  }, []);
  return null;
}
