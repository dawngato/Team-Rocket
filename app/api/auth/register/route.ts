import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, studentId, email, department, year, password } = body;

    if (!name?.trim() || !studentId?.trim() || !email?.trim()) {
      return NextResponse.json(
        { error: 'Name, Student ID, and University Email are required.' },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'A secure password of at least 6 characters is required.' },
        { status: 400 }
      );
    }

    const cleanStudentId = studentId.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check if studentId already exists
    const existingById = await prisma.user.findUnique({
      where: { studentId: cleanStudentId },
    });

    if (existingById) {
      return NextResponse.json(
        {
          error:
            'A student account is already registered with this Student ID. University policy enforces strictly One Account per Student.',
        },
        { status: 409 }
      );
    }

    // Check if email already exists
    const existingByEmail = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingByEmail) {
      return NextResponse.json(
        {
          error:
            'A student account is already registered with this email address.',
        },
        { status: 409 }
      );
    }

    // Create user with password hash and automatically assign eligibility
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          studentId: cleanStudentId,
          email: cleanEmail,
          name: name.trim(),
          passwordHash: hashPassword(password),
          role: 'STUDENT',
          department: department?.trim() || 'General Studies',
          year: Number(year) || 1,
          status: 'ACTIVE',
        },
      });

      // Find all OPEN and SCHEDULED elections
      const relevantElections = await tx.election.findMany({
        where: {
          status: { in: ['OPEN', 'SCHEDULED', 'DRAFT'] },
        },
      });

      // Create eligibility records for this new student
      for (const elec of relevantElections) {
        await tx.voterEligibility.create({
          data: {
            electionId: elec.id,
            studentId: cleanStudentId,
            userId: newUser.id,
            isEligible: true,
            hasVoted: false,
          },
        });
      }

      // Log audit event
      await tx.auditEvent.create({
        data: {
          eventType: 'STUDENT_REGISTERED',
          actorId: newUser.id,
          actorRole: 'STUDENT',
          outcome: 'SUCCESS',
          details: JSON.stringify({
            studentId: cleanStudentId,
            department: newUser.department,
            assignedElectionsCount: relevantElections.length,
          }),
        },
      });

      return newUser;
    });

    // Set cookie for instant login
    const res = NextResponse.json({
      success: true,
      message: 'Student successfully registered and authenticated.',
      user: result,
    });

    res.cookies.set('cv_session_user', result.id, {
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
