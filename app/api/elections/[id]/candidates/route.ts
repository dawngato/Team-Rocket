import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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
    const election = await prisma.election.findUnique({
      where: { id: electionId },
    });

    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    if (election.status !== 'DRAFT' && election.status !== 'SCHEDULED') {
      return NextResponse.json(
        {
          error: `Candidates cannot be modified once voting has begun or election is ${election.status}.`,
        },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { name, department, academicYear, photoUrl, manifesto, shortBio, campaignPriorities, websiteUrl } = body;

    if (!name) {
      return NextResponse.json({ error: 'Candidate name is required' }, { status: 400 });
    }

    const count = await prisma.candidate.count({ where: { electionId } });

    const newCandidate = await prisma.candidate.create({
      data: {
        electionId,
        name,
        department: department || 'General',
        academicYear: Number(academicYear) || 3,
        photoUrl: photoUrl || null,
        manifesto: manifesto || '',
        shortBio: shortBio || '',
        campaignPriorities: JSON.stringify(campaignPriorities || []),
        websiteUrl: websiteUrl || null,
        ballotOrder: count + 1,
      },
    });

    await prisma.auditEvent.create({
      data: {
        eventType: 'CANDIDATE_ADDED',
        actorId: user.id,
        actorRole: user.role,
        electionId,
        outcome: 'SUCCESS',
        details: JSON.stringify({ candidateName: name, candidateId: newCandidate.id }),
      },
    });

    return NextResponse.json({ success: true, candidate: newCandidate });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
