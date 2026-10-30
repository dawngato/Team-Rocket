import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createHash } from 'crypto';
import { MerkleTree } from '@/lib/crypto/merkle';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const electionId = params.id;
    const body = await req.json();
    const { receiptCode } = body;

    if (!receiptCode || typeof receiptCode !== 'string') {
      return NextResponse.json({ error: 'Receipt code is required' }, { status: 400 });
    }

    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        checkpoints: {
          orderBy: { sequenceNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    // Compute receipt hash
    const receiptHash = createHash('sha256').update(receiptCode.trim()).digest('hex');

    // Find the ballot with this receiptHash
    const matchingBallot = await prisma.acceptedBallot.findFirst({
      where: {
        electionId: election.id,
        receiptHash,
      },
    });

    if (!matchingBallot) {
      return NextResponse.json(
        {
          verified: false,
          error: 'No accepted ballot found matching this receipt code.',
        },
        { status: 404 }
      );
    }

    // Fetch all ballots to generate inclusion proof
    const allBallots = await prisma.acceptedBallot.findMany({
      where: { electionId: election.id },
      orderBy: { leafIndex: 'asc' },
    });

    const leafHashes = allBallots.map((b) => b.leafHash);
    const tree = new MerkleTree(leafHashes);
    const proofData = tree.getProof(matchingBallot.leafIndex);

    if (!proofData) {
      return NextResponse.json(
        { verified: false, error: 'Could not construct cryptographic proof.' },
        { status: 500 }
      );
    }

    const isProofValid = MerkleTree.verifyProof(
      matchingBallot.leafHash,
      proofData.proof,
      election.merkleRoot || tree.getRoot()
    );

    const latestCheckpoint = election.checkpoints[0];

    return NextResponse.json({
      verified: isProofValid,
      receiptCode: receiptCode.trim(),
      leafIndex: matchingBallot.leafIndex,
      leafHash: matchingBallot.leafHash,
      proof: proofData.proof,
      merkleRoot: election.merkleRoot,
      checkpointSequence: latestCheckpoint?.sequenceNumber ?? 0,
      checkpointSignature: latestCheckpoint?.signature ?? '',
      ballotCount: leafHashes.length,
      electionTitle: election.title,
      timestamp: matchingBallot.createdAt,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
