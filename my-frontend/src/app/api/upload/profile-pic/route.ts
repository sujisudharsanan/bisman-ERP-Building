import { NextRequest, NextResponse } from 'next/server';

const BACKEND_BASE =
  process.env.RAILWAY_ENVIRONMENT
    ? `http://127.0.0.1:${process.env.PORT || 8080}`
    : (
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_API_BASE ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      'http://localhost:3001'
    );

// POST - Upload profile picture
export async function POST(req: NextRequest) {
  try {
    console.log('POST /api/upload/profile-pic - Starting upload proxy'); // Debug
    
    // Get the form data from the request
    const formData = await req.formData();
    const file = formData.get('profile_pic');
    
    console.log('File received:', file ? 'Yes' : 'No'); // Debug
    if (file instanceof File) {
      console.log('File details:', { name: file.name, size: file.size, type: file.type }); // Debug
    }

    // Forward cookies from client
    const cookieHeader = req.headers.get('cookie');
    console.log('Cookie header:', cookieHeader ? 'Present' : 'Missing'); // Debug

    console.log('Backend URL:', `${BACKEND_BASE}/api/upload/profile-pic`); // Debug
    
    // Make request to backend
    const backendRes = await fetch(`${BACKEND_BASE}/api/upload/profile-pic`, {
      method: 'POST',
      headers: {
        ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
      },
      body: formData,
    });

    console.log('Backend response status:', backendRes.status); // Debug
    
    const data = await backendRes.json();
    console.log('Backend response data:', data); // Debug

    // Forward Set-Cookie headers from backend to client
    const setCookie = backendRes.headers.get('set-cookie');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    if (setCookie) {
      headers['Set-Cookie'] = setCookie;
    }

    return NextResponse.json(data, { 
      status: backendRes.status,
      headers 
    });
  } catch (error) {
    console.error('Upload proxy error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Upload failed',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET - Get current profile picture
export async function GET(req: NextRequest) {
  try {
    // Forward cookies from client
    const cookieHeader = req.headers.get('cookie');

    // Make request to backend
    const backendRes = await fetch(`${BACKEND_BASE}/api/upload/profile-pic`, {
      method: 'GET',
      headers: {
        ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
      },
    });

    const data = await backendRes.json();

    return NextResponse.json(data, { 
      status: backendRes.status 
    });
  } catch (error) {
    console.error('Get profile picture error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get profile picture',
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
