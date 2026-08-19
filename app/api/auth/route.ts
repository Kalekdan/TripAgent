import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, getCurrentUsername, isDemoUsername } from '@/lib/auth';

export async function GET() {
  const username = await getCurrentUsername();
  return NextResponse.json({ username });
}

export async function POST(request: NextRequest) {
  const { username, password } = await request.json();
  const normalizedUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';

  if (!isDemoUsername(normalizedUsername) || password !== normalizedUsername) {
    return NextResponse.json({ error: 'Use a valid demo username and matching password.' }, { status: 401 });
  }

  const response = NextResponse.json({ username: normalizedUsername });
  response.cookies.set(AUTH_COOKIE, normalizedUsername, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE);
  return response;
}
