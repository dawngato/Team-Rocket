import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { castBallot } from '@/lib/voting';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    if (user.role !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Only registered students may cast ballots' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { candidateId } = body;

    if (!candidateId) {
      return NextResponse.json({ error: 'Candidate selection is required' }, { status: 400 });
    }

    const electionId = params.id;
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    const result = await castBallot({
      userId: user.id,
      electionId,
      candidateId,
      ipAddress: ip,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Ballot submission failed' }, { status: 400 });
  }
}
