import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password, expectedRole } = body;

    if (!identifier?.trim()) {
      return NextResponse.json(
        { error: 'Student ID or University Email is required.' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password or Security Key is required.' },
        { status: 400 }
      );
    }

    const clean = identifier.trim();

    // 1. Strict Database Identity Match
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { studentId: clean.toUpperCase() },
          { email: clean.toLowerCase() },
          { studentId: clean },
        ],
      },
    });

    if (!user) {
      // Log failed identification attempt
      await prisma.auditEvent.create({
        data: {
          eventType: 'AUTH_FAILED_UNKNOWN_IDENTITY',
          actorId: 'UNAUTHENTICATED',
          actorRole: 'ANONYMOUS',
          outcome: 'FAILURE',
          details: JSON.stringify({ attemptedIdentifier: clean }),
        },
      }).catch(() => null);

      return NextResponse.json(
        {
          error:
            'Authentication failed: No university record found matching this Student ID or Email. Please check your credentials or register your student account.',
        },
        { status: 401 }
      );
    }

    // 2. Strict Password & Security Key Matching against Database Hash
    const isPasswordValid = verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      // Log failed password attempt
      await prisma.auditEvent.create({
        data: {
          eventType: 'AUTH_FAILED_BAD_PASSWORD',
          actorId: user.id,
          actorRole: user.role,
          outcome: 'FAILURE',
          details: JSON.stringify({ studentId: user.studentId }),
        },
      }).catch(() => null);

      return NextResponse.json(
        {
          error:
            'Authentication failed: Incorrect password or security key. Access denied.',
        },
        { status: 401 }
      );
    }

    // 3. Status Verification
    if (user.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'This university account has been suspended or is inactive.' },
        { status: 403 }
      );
    }

    // 4. Role Match verification if specific panel requested
    if (expectedRole && user.role !== expectedRole) {
      return NextResponse.json(
        {
          error: `Role mismatch: This account has '${user.role}' permissions, but this portal requires '${expectedRole}'. Please select the appropriate login tab.`,
        },
        { status: 403 }
      );
    }

    // 5. Successful Authentication -> Log audit event & set session cookie
    await prisma.auditEvent.create({
      data: {
        eventType: 'AUTH_LOGIN_SUCCESS',
        actorId: user.id,
        actorRole: user.role,
        outcome: 'SUCCESS',
        details: JSON.stringify({
          studentId: user.studentId,
          role: user.role,
          department: user.department,
        }),
      },
    }).catch(() => null);

    const safeUser = {
      id: user.id,
      studentId: user.studentId,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      year: user.year,
    };

    const res = NextResponse.json({ success: true, user: safeUser });
    res.cookies.set('cv_session_user', user.id, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
