/**
 * Next.js API Route Proxy for /api/health
 * 
 * This proxies requests from the frontend to the backend,
 * eliminating CORS issues by making requests same-origin.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Priority: BACKEND_URL (runtime) > NEXT_PUBLIC_* (build-time) > fallback
  const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  
  try {
    // Forward the request to the backend
    const backendResponse = await fetch(`${BACKEND_URL}/api/health`, {
      method: req.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forward cookies if present
        ...(req.headers.cookie ? { Cookie: req.headers.cookie } : {}),
      },
    });

    const data = await backendResponse.json();
    
    // Forward the backend response
    res.status(backendResponse.status).json(data);
  } catch (error: any) {
    console.error('❌ Backend proxy error:', error.message);
    res.status(503).json({
      status: 'error',
      message: 'Backend unreachable',
      error: error.message,
    });
  }
}
