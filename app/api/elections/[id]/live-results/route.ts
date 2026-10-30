import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const CHART_COLORS = [
  '#304FFE', // Royal Cobalt
  '#10B981', // Mint Emerald
  '#F59E0B', // Amber Gold
  '#8B5CF6', // Purple Violet
  '#EC4899', // Rose Pink
  '#06B6D4', // Cyan Teal
  '#6366F1', // Indigo
];

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const electionId = params.id;

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        candidates: {
          orderBy: { ballotOrder: 'asc' },
        },
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

    const totalBallots = election._count.ballots;
    const totalEligible = election._count.eligibilities;
    const turnoutPercentage =
      totalEligible > 0 ? Math.round((totalBallots / totalEligible) * 1000) / 10 : 0;

    // 1. Group real votes by candidate
    const voteCounts = await prisma.acceptedBallot.groupBy({
      by: ['candidateId'],
      where: { electionId },
      _count: { candidateId: true },
    });

    const countMap: Record<string, number> = {};
    for (const row of voteCounts) {
      countMap[row.candidateId] = row._count.candidateId;
    }

    const candidateData = election.candidates.map((cand, idx) => {
      const votes = countMap[cand.id] || 0;
      const percentage =
        totalBallots > 0 ? Math.round((votes / totalBallots) * 1000) / 10 : 0;

      return {
        id: cand.id,
        name: cand.name,
        department: cand.department,
        academicYear: cand.academicYear,
        ballotOrder: cand.ballotOrder,
        votes,
        percentage,
        color: CHART_COLORS[idx % CHART_COLORS.length],
      };
    });

    // Sort descending by votes
    const sortedCandidates = [...candidateData].sort((a, b) => b.votes - a.votes);

    // 2. Cumulative Vote Timeline (Hourly bucketed)
    const rawBallots = await prisma.acceptedBallot.findMany({
      where: { electionId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    });

    let cumulative = 0;
    const timelineData = rawBallots.map((b, i) => {
      cumulative = i + 1;
      return {
        timestamp: b.createdAt.toISOString(),
        timeLabel: b.createdAt.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        ballots: cumulative,
      };
    });

    // 3. Department Participation (from VoterEligibility for privacy)
    const departmentTurnout: Record<
      string,
      { department: string; registered: number; voted: number; turnout: number }
    > = {};

    const eligibilities = await prisma.voterEligibility.findMany({
      where: { electionId },
      include: {
        user: { select: { department: true } },
      },
    });

    for (const el of eligibilities) {
      const dept = el.user.department || 'Other';
      if (!departmentTurnout[dept]) {
        departmentTurnout[dept] = { department: dept, registered: 0, voted: 0, turnout: 0 };
      }
      departmentTurnout[dept].registered += 1;
      if (el.hasVoted) {
        departmentTurnout[dept].voted += 1;
      }
    }

    const deptStats = Object.values(departmentTurnout).map((d) => ({
      ...d,
      turnout: d.registered > 0 ? Math.round((d.voted / d.registered) * 1000) / 10 : 0,
    }));

    return NextResponse.json({
      election: {
        id: election.id,
        title: election.title,
        status: election.status,
        department: election.department,
        academicSession: election.academicSession,
        totalBallots,
        totalEligible,
        turnoutPercentage,
        isProjectedSample: election.status === 'OPEN',
        disclaimer:
          election.status === 'OPEN'
            ? 'Live Sample Visual Presentation based on real-time voting data. Official final certified results may vary slightly upon final auditor sealing.'
            : 'Official Final Certified Results.',
      },
      candidateShares: sortedCandidates,
      timeline: timelineData,
      departmentStats: deptStats,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
