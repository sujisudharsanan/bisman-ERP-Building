import { NextResponse } from 'next/server';

/**
 * Test endpoint to verify cookie flow through the proxy
 */
export async function GET(req: Request) {
  const cookies = req.headers.get('cookie') || 'No cookies';
  
  return NextResponse.json({
    message: 'Cookie test endpoint',
    cookies_received: cookies,
    user_agent: req.headers.get('user-agent'),
    origin: req.headers.get('origin'),
    referer: req.headers.get('referer'),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  
  const resp = NextResponse.json({
    message: 'Test cookie set',
    test: 'value',
  });
  
  // Set a test cookie with minimal restrictions
  resp.headers.set('Set-Cookie', 'test_mm_cookie=test_value; Path=/; HttpOnly');
  
  return resp;
}
