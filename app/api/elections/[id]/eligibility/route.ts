import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'AUDITOR')) {
      return NextResponse.json({ error: 'Administrative or Auditor access required' }, { status: 403 });
    }

    const electionId = params.id;
    const eligibilities = await prisma.voterEligibility.findMany({
      where: { electionId },
      include: {
        user: {
          select: {
            id: true,
            studentId: true,
            name: true,
            email: true,
            department: true,
            year: true,
          },
        },
      },
      orderBy: { studentId: 'asc' },
    });

    return NextResponse.json({ eligibilities });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Administrative role required' }, { status: 403 });
    }

    const electionId = params.id;
    const election = await prisma.election.findUnique({ where: { id: electionId } });
    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    const body = await req.json();
    const { studentIds } = body; // Array of studentId strings

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: 'Array of studentIds is required' }, { status: 400 });
    }

    let importedCount = 0;
    let skippedCount = 0;

    for (const sid of studentIds) {
      const cleanSid = sid.trim();
      const studentUser = await prisma.user.findUnique({
        where: { studentId: cleanSid },
      });

      if (!studentUser) {
        skippedCount++;
        continue;
      }

      // Check if already registered
      const existing = await prisma.voterEligibility.findUnique({
        where: {
          electionId_userId: {
            electionId,
            userId: studentUser.id,
          },
        },
      });

      if (!existing) {
        await prisma.voterEligibility.create({
          data: {
            electionId,
            studentId: cleanSid,
            userId: studentUser.id,
            isEligible: true,
            hasVoted: false,
          },
        });
        importedCount++;
      } else {
        skippedCount++;
      }
    }

    await prisma.auditEvent.create({
      data: {
        eventType: 'ELIGIBILITY_LIST_UPDATED',
        actorId: user.id,
        actorRole: user.role,
        electionId,
        outcome: 'SUCCESS',
        details: JSON.stringify({ imported: importedCount, skipped: skippedCount }),
      },
    });

    return NextResponse.json({
      success: true,
      importedCount,
      skippedCount,
      totalProcessed: studentIds.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
