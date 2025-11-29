/**
 * Simple healthcheck endpoint for Railway
 * Returns 200 OK if the server is running
 * Does NOT require backend connectivity
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'bisman-erp-frontend',
    },
    { status: 200 }
  );
}

export const dynamic = 'force-dynamic';
