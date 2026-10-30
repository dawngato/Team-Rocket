import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();

    const elections = await prisma.election.findMany({
      include: {
        candidates: {
          select: {
            id: true,
            name: true,
            department: true,
            academicYear: true,
            photoUrl: true,
            shortBio: true,
            manifesto: true,
            ballotOrder: true,
          },
          orderBy: { ballotOrder: 'asc' },
        },
        _count: {
          select: {
            ballots: true,
            eligibilities: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // If user is a student, check their specific eligibility & vote status
    let userStatusMap: Record<string, { isEligible: boolean; hasVoted: boolean; receiptCode?: string | null }> = {};
    if (user && user.role === 'STUDENT') {
      const eligibilities = await prisma.voterEligibility.findMany({
        where: { userId: user.id },
      });
      for (const el of eligibilities) {
        userStatusMap[el.electionId] = {
          isEligible: el.isEligible,
          hasVoted: el.hasVoted,
          receiptCode: el.receiptCode,
        };
      }
    }

    const formatted = elections.map((e) => {
      const eligibleCount = e._count.eligibilities;
      const ballotCount = e._count.ballots;
      const turnout = eligibleCount > 0 ? (ballotCount / eligibleCount) * 100 : 0;

      return {
        ...e,
        ballotCount,
        eligibleCount,
        turnoutPercentage: Math.round(turnout * 10) / 10,
        userStatus: userStatusMap[e.id] || { isEligible: false, hasVoted: false },
      };
    });

    return NextResponse.json({ elections: formatted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Administrative role required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      department,
      academicSession,
      category,
      startTime,
      endTime,
      timeZone,
      resultsPolicy,
      candidates,
    } = body;

    if (!title || !description || !startTime || !endTime) {
      return NextResponse.json({ error: 'Missing required election fields' }, { status: 400 });
    }

    const newElection = await prisma.$transaction(async (tx) => {
      const election = await tx.election.create({
        data: {
          title,
          description,
          department: department || 'University Wide',
          academicSession: academicSession || '2025-2026',
          category: category || 'STUDENT_GOVERNMENT',
          status: 'DRAFT',
          startTime: new Date(startTime),
          endTime: new Date(endTime),
          timeZone: timeZone || 'America/New_York',
          resultsPolicy: resultsPolicy || 'RESTRICTED_UNTIL_CLOSED',
        },
      });

      if (Array.isArray(candidates) && candidates.length > 0) {
        for (let i = 0; i < candidates.length; i++) {
          const c = candidates[i];
          await tx.candidate.create({
            data: {
              electionId: election.id,
              name: c.name,
              department: c.department || 'General',
              academicYear: Number(c.academicYear) || 3,
              shortBio: c.shortBio || '',
              manifesto: c.manifesto || '',
              campaignPriorities: JSON.stringify(c.campaignPriorities || []),
              photoUrl: c.photoUrl || null,
              ballotOrder: i + 1,
            },
          });
        }
      }

      await tx.auditEvent.create({
        data: {
          eventType: 'ELECTION_CREATED',
          actorId: user.id,
          actorRole: user.role,
          electionId: election.id,
          outcome: 'SUCCESS',
          details: JSON.stringify({ title: election.title, category: election.category }),
        },
      });

      return election;
    });

    return NextResponse.json({ success: true, election: newElection });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
