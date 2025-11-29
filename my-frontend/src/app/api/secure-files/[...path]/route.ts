import { NextRequest, NextResponse } from 'next/server';

// Priority: BACKEND_URL (runtime server-side) > NEXT_PUBLIC_* (build-time) > fallback
const BACKEND_BASE =
  process.env.BACKEND_URL ||
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:3001';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    const filePath = path.join('/');
    
    // Forward cookies from client for authentication
    const cookieHeader = req.headers.get('cookie');

    // Make request to backend
    const backendRes = await fetch(`${BACKEND_BASE}/api/secure-files/${filePath}`, {
      method: 'GET',
      headers: {
        ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
      },
    });

    if (!backendRes.ok) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: backendRes.status }
      );
    }

    // Get the file data as buffer
    const buffer = await backendRes.arrayBuffer();
    
    // Get content type from backend response
    const contentType = backendRes.headers.get('content-type') || 'application/octet-stream';

    // Return the file with appropriate headers
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Secure file proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch file' },
      { status: 500 }
    );
  }
}
