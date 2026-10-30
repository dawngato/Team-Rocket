import { NextResponse } from 'next/server';

export async function POST() {
  const res = NextResponse.json({ success: true, message: 'Logged out successfully' });
  res.cookies.set('cv_session_user', '', {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 0,
  });
  return res;
}
