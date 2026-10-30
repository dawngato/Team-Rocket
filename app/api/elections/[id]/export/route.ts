import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureAuditorKeys } from '@/lib/crypto/signatures';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const electionId = params.id;
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        candidates: true,
        manifest: true,
        checkpoints: {
          orderBy: { sequenceNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    const { publicKeyPem } = ensureAuditorKeys();

    // Get all accepted ballots canonically
    const ballots = await prisma.acceptedBallot.findMany({
      where: { electionId },
      orderBy: { leafIndex: 'asc' },
      select: {
        id: true,
        candidateId: true,
        electionId: true,
        receiptHash: true,
      },
    });

    const exportBallots = ballots.map((b) => ({
      ballotId: b.id,
      candidateId: b.candidateId,
      electionId: b.electionId,
      receiptHash: b.receiptHash,
      version: '1.0',
    }));

    // Tally
    const tally: Record<string, number> = {};
    for (const c of election.candidates) tally[c.id] = 0;
    for (const b of ballots) tally[b.candidateId] = (tally[b.candidateId] || 0) + 1;

    const manifestObj = election.manifest
      ? JSON.parse(election.manifest.canonicalManifestJson)
      : {
          electionId: election.id,
          title: election.title,
          category: election.category,
          department: election.department,
          academicSession: election.academicSession,
          protocolVersion: '1.0',
          ballotCount: ballots.length,
          merkleRoot: election.merkleRoot,
          tally,
          candidates: election.candidates.map((c) => ({
            id: c.id,
            name: c.name,
            department: c.department,
          })),
          publishedAt: election.publishedAt?.toISOString() || new Date().toISOString(),
        };

    const latestCheckpoint = election.checkpoints[0] || null;

    return NextResponse.json({
      manifest: manifestObj,
      checkpoint: latestCheckpoint,
      ballots: exportBallots,
      ballotsJsonl: exportBallots.map((b) => JSON.stringify(b)).join('\n') + '\n',
      auditorPublicKey: publicKeyPem,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
