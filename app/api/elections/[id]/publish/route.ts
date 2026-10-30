import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canonicalizeJson } from '@/lib/crypto/merkle';
import { ensureAuditorKeys } from '@/lib/crypto/signatures';
import { createHash, sign } from 'crypto';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Administrative authority required' }, { status: 403 });
    }

    const electionId = params.id;
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        candidates: true,
        checkpoints: {
          orderBy: { sequenceNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    if (election.status !== 'CLOSED' && election.status !== 'VERIFIED') {
      return NextResponse.json(
        {
          error: `Election cannot be published while in state '${election.status}'. It must be CLOSED and VERIFIED first.`,
        },
        { status: 400 }
      );
    }

    // Compute official tally
    const voteCounts = await prisma.acceptedBallot.groupBy({
      by: ['candidateId'],
      where: { electionId: election.id },
      _count: { candidateId: true },
    });

    const tally: Record<string, number> = {};
    for (const cand of election.candidates) {
      tally[cand.id] = 0;
    }
    for (const row of voteCounts) {
      tally[row.candidateId] = row._count.candidateId;
    }

    const totalBallots = await prisma.acceptedBallot.count({
      where: { electionId: election.id },
    });

    const now = new Date();
    const manifestPayload = {
      electionId: election.id,
      title: election.title,
      category: election.category,
      department: election.department,
      academicSession: election.academicSession,
      protocolVersion: '1.0',
      ballotCount: totalBallots,
      merkleRoot: election.merkleRoot,
      tally,
      candidates: election.candidates.map((c) => ({
        id: c.id,
        name: c.name,
        department: c.department,
      })),
      publishedAt: now.toISOString(),
    };

    const canonicalManifestJson = canonicalizeJson(manifestPayload);
    const manifestHash = createHash('sha256').update(canonicalManifestJson).digest('hex');

    const { privateKeyPem } = ensureAuditorKeys();
    const signature = sign(null, Buffer.from(canonicalManifestJson, 'utf8'), privateKeyPem).toString('hex');

    const published = await prisma.$transaction(async (tx) => {
      // Upsert manifest
      await tx.electionManifest.upsert({
        where: { electionId: election.id },
        create: {
          electionId: election.id,
          canonicalManifestJson,
          manifestHash,
          signature,
          publishedAt: now,
        },
        update: {
          canonicalManifestJson,
          manifestHash,
          signature,
          publishedAt: now,
        },
      });

      // Update election state to PUBLISHED
      const updated = await tx.election.update({
        where: { id: election.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: now,
        },
      });

      // Audit event
      await tx.auditEvent.create({
        data: {
          eventType: 'RESULTS_PUBLISHED',
          actorId: user.id,
          actorRole: user.role,
          electionId: election.id,
          outcome: 'SUCCESS',
          details: JSON.stringify({
            ballotCount: totalBallots,
            manifestHash,
            merkleRoot: election.merkleRoot,
          }),
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      election: published,
      manifest: manifestPayload,
      manifestHash,
      signature,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
