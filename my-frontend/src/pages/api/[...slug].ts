/**
 * Next.js API Route: Catch-all proxy for /api/*
 * 
 * CRITICAL FIX: Uses http/https module instead of fetch to properly
 * handle multiple Set-Cookie headers from backend.
 * 
 * NOTE: Uses BACKEND_URL (server-side env var) for runtime, not NEXT_PUBLIC_*
 * which is inlined at build time. This allows Railway to inject the URL at runtime.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import http from 'http';
import https from 'https';
import { URL } from 'url';

// Priority: BACKEND_URL (runtime) > API_URL (runtime) > NEXT_PUBLIC_API_URL (build-time) > fallback
const BACKEND_URL = process.env.BACKEND_URL || process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Extract the API path (everything after /api/)
  const { slug = [] } = req.query;
  const apiPath = Array.isArray(slug) ? slug.join('/') : slug;
  
  // Build query string if present
  const queryParams = Object.keys(req.query)
    .filter(key => key !== 'slug')
    .map(key => `${key}=${req.query[key]}`)
    .join('&');
  
  const targetUrl = `${BACKEND_URL}/api/${apiPath}${queryParams ? `?${queryParams}` : ''}`;
  
  console.log(`[API Proxy] ${req.method} /api/${apiPath} → ${targetUrl}`);
  console.log(`[API Proxy] Cookies from browser:`, req.headers.cookie ? '✅ Present' : '❌ None');

  return new Promise<void>((resolve) => {
    try {
      const url = new URL(targetUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;

      // Build headers to forward
      const headers: Record<string, string> = {};

      // Forward content-type
      if (req.headers['content-type']) {
        headers['Content-Type'] = req.headers['content-type'] as string;
      } else {
        headers['Content-Type'] = 'application/json';
      }

      // CRITICAL: Forward cookies (important for auth)
      if (req.headers.cookie) {
        headers['Cookie'] = req.headers.cookie;
        console.log(`[API Proxy] Forwarding cookies to backend`);
      }

      // Forward authorization header if present
      if (req.headers.authorization) {
        headers['Authorization'] = req.headers.authorization as string;
      }

      // Build request options
      const options: http.RequestOptions = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: req.method,
        headers,
      };

      // Make the request to backend
      const proxyReq = httpModule.request(options, (proxyRes) => {
        console.log(`[API Proxy] Backend response: ${proxyRes.statusCode}`);

        // CRITICAL: Forward ALL Set-Cookie headers from backend to client
        const setCookieHeaders = proxyRes.headers['set-cookie'];
        if (setCookieHeaders) {
          console.log(`[API Proxy] Setting ${setCookieHeaders.length} cookies from backend:`, setCookieHeaders);
          res.setHeader('Set-Cookie', setCookieHeaders);
        } else {
          console.log(`[API Proxy] No cookies to set from backend`);
        }

        // Forward other important headers
        if (proxyRes.headers['content-type']) {
          res.setHeader('Content-Type', proxyRes.headers['content-type']);
        }

        // Collect response data
        let data = '';
        proxyRes.on('data', (chunk) => {
          data += chunk;
        });

        proxyRes.on('end', () => {
          // Parse JSON if possible
          let responseData;
          try {
            responseData = JSON.parse(data);
          } catch (e) {
            responseData = data;
          }

          res.status(proxyRes.statusCode || 500).json(responseData);
          resolve();
        });
      });

      proxyReq.on('error', (error) => {
        console.error(`[API Proxy] ❌ Error proxying to ${targetUrl}:`, error.message);
        res.status(503).json({
          success: false,
          error: 'Backend unreachable',
          message: error.message,
          target: targetUrl,
        });
        resolve();
      });

      // Send request body if present
      if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
        const bodyData = typeof req.body === 'string' 
          ? req.body 
          : JSON.stringify(req.body);
        proxyReq.write(bodyData);
      }

      proxyReq.end();

    } catch (error: any) {
      console.error(`[API Proxy] ❌ Setup error:`, error.message);
      res.status(500).json({
        success: false,
        error: 'Proxy configuration error',
        message: error.message,
      });
      resolve();
    }
  });
}

// Disable body parser so we can handle raw body
export const config = {
  api: {
    bodyParser: true,
    externalResolver: true,
  },
};
