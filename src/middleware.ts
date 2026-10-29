import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decideCors } from '@/lib/auth/cors';

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith('/api/')) return NextResponse.next();

  const decision = decideCors({
    authRequired: process.env.AUTH_REQUIRED === 'true',
    origin: request.headers.get('origin'),
    host: request.headers.get('host'),
  });

  if (!decision.allow) {
    return NextResponse.json({ success: false, error: 'This site may not use the API.' }, { status: 403 });
  }
  if (request.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers: decision.headers });

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(decision.headers)) response.headers.set(key, value);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
