import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const VALID_STATE_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['SCHEDULED', 'OPEN'],
  SCHEDULED: ['OPEN', 'DRAFT'],
  OPEN: ['CLOSED'],
  CLOSED: ['VERIFIED'],
  VERIFIED: ['PUBLISHED'],
  PUBLISHED: [], // Terminal immutable state
};

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const electionId = params.id;
    const user = await getCurrentUser();

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        candidates: {
          orderBy: { ballotOrder: 'asc' },
        },
        checkpoints: {
          orderBy: { sequenceNumber: 'desc' },
          take: 5,
        },
        manifest: true,
        _count: {
          select: {
            ballots: true,
            eligibilities: true,
          },
        },
      },
    });

    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    const eligibleCount = election._count.eligibilities;
    const ballotCount = election._count.ballots;
    const turnoutPercentage = eligibleCount > 0 ? (ballotCount / eligibleCount) * 100 : 0;

    // Check user's individual eligibility & status if logged in
    let userEligibility = null;
    if (user && user.role === 'STUDENT') {
      userEligibility = await prisma.voterEligibility.findUnique({
        where: {
          electionId_userId: {
            electionId: election.id,
            userId: user.id,
          },
        },
      });
    }

    // Determine if candidate-level totals can be disclosed
    // Allowed only if PUBLISHED, or user is ADMIN / AUDITOR
    const canViewResults =
      election.status === 'PUBLISHED' ||
      (user && (user.role === 'ADMIN' || user.role === 'AUDITOR'));

    let candidateResults: Array<{ id: string; name: string; votes: number; percentage: number }> = [];
    let winner = null;

    if (canViewResults) {
      // Aggregate real votes from acceptedBallot table
      const voteCounts = await prisma.acceptedBallot.groupBy({
        by: ['candidateId'],
        where: { electionId: election.id },
        _count: { candidateId: true },
      });

      const countMap: Record<string, number> = {};
      for (const row of voteCounts) {
        countMap[row.candidateId] = row._count.candidateId;
      }

      candidateResults = election.candidates.map((cand) => {
        const votes = countMap[cand.id] || 0;
        const percentage = ballotCount > 0 ? (votes / ballotCount) * 100 : 0;
        return {
          id: cand.id,
          name: cand.name,
          votes,
          percentage: Math.round(percentage * 10) / 10,
        };
      });

      // Sort by votes desc
      candidateResults.sort((a, b) => b.votes - a.votes);
      if (candidateResults.length > 0 && candidateResults[0].votes > 0) {
        if (candidateResults.length > 1 && candidateResults[0].votes === candidateResults[1].votes) {
          winner = { ...candidateResults[0], isTie: true };
        } else {
          winner = { ...candidateResults[0], isTie: false };
        }
      }
    }

    // Turnout timeline (grouped by hour)
    const ballots = await prisma.acceptedBallot.findMany({
      where: { electionId: election.id },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    let runningTotal = 0;
    const turnoutTimeline = ballots.map((b, idx) => {
      runningTotal = idx + 1;
      return {
        time: b.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cumulativeBallots: runningTotal,
      };
    });

    return NextResponse.json({
      election: {
        ...election,
        ballotCount,
        eligibleCount,
        turnoutPercentage: Math.round(turnoutPercentage * 10) / 10,
        userEligibility,
        canViewResults,
        candidateResults: canViewResults ? candidateResults : null,
        winner: canViewResults ? winner : null,
        turnoutTimeline,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Administrative role required' }, { status: 403 });
    }

    const electionId = params.id;
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: { candidates: true },
    });

    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    const body = await req.json();
    const { status, title, description } = body;

    if (status) {
      const allowedNext = VALID_STATE_TRANSITIONS[election.status] || [];
      if (!allowedNext.includes(status)) {
        return NextResponse.json(
          {
            error: `Invalid election state transition from '${election.status}' to '${status}'. Allowed: ${allowedNext.join(', ')}`,
          },
          { status: 400 }
        );
      }

      // Check preconditions
      if (status === 'OPEN' && election.candidates.length < 2) {
        return NextResponse.json(
          { error: 'An election requires at least two candidates before opening.' },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const u = await tx.election.update({
          where: { id: electionId },
          data: { status },
        });

        await tx.auditEvent.create({
          data: {
            eventType: 'ELECTION_STATE_CHANGED',
            actorId: user.id,
            actorRole: user.role,
            electionId: election.id,
            outcome: 'SUCCESS',
            details: JSON.stringify({ from: election.status, to: status }),
          },
        });

        return u;
      });

      return NextResponse.json({ success: true, election: updated });
    }

    // Generic update
    const updated = await prisma.election.update({
      where: { id: electionId },
      data: {
        title: title || election.title,
        description: description || election.description,
      },
    });

    return NextResponse.json({ success: true, election: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
