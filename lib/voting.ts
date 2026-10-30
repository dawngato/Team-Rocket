import { prisma } from './prisma';
import { createHash, randomBytes } from 'crypto';
import { hashBallotLeaf, MerkleTree } from './crypto/merkle';
import { signCheckpoint, hashCheckpoint, CheckpointData } from './crypto/signatures';

export interface SubmitBallotParams {
  userId: string;
  electionId: string;
  candidateId: string;
  ipAddress?: string;
}

export interface BallotSubmissionResult {
  success: boolean;
  receiptCode: string;
  ballotId: string;
  leafIndex: number;
  merkleRoot: string;
  timestamp: string;
  electionTitle: string;
}

export async function castBallot({
  userId,
  electionId,
  candidateId,
  ipAddress,
}: SubmitBallotParams): Promise<BallotSubmissionResult> {
  // 1. Verify User
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || user.status !== 'ACTIVE') {
    throw new Error('Unauthorized or inactive account');
  }

  // 2. Verify Election Status & Dates
  const election = await prisma.election.findUnique({
    where: { id: electionId },
  });

  if (!election) {
    throw new Error('Election not found');
  }

  if (election.status !== 'OPEN') {
    throw new Error(`Election is currently ${election.status}. Ballots can only be accepted when OPEN.`);
  }

  const now = new Date();
  if (now < election.startTime) {
    throw new Error('Election has not opened yet.');
  }
  if (now > election.endTime) {
    throw new Error('Election voting period has ended.');
  }

  // 3. Verify Candidate Belongs to this Election
  const candidate = await prisma.candidate.findFirst({
    where: { id: candidateId, electionId: election.id },
  });

  if (!candidate) {
    throw new Error('Invalid candidate selected for this election.');
  }

  // 4. Generate Nonce & Receipt
  const randomSuffix = randomBytes(4).toString('hex').toUpperCase();
  const receiptCode = `CV-${election.category.substring(0, 3)}-${randomBytes(3).toString('hex').toUpperCase()}-${randomSuffix}`;
  const receiptHash = createHash('sha256').update(receiptCode).digest('hex');
  const ballotId = `bal-${randomBytes(8).toString('hex')}`;

  // 5. Database Transaction to guarantee atomic consumption of entitlement & ballot recording
  const result = await prisma.$transaction(async (tx) => {
    // Check eligibility
    const eligibility = await tx.voterEligibility.findUnique({
      where: {
        electionId_userId: {
          electionId: election.id,
          userId: user.id,
        },
      },
    });

    if (!eligibility || !eligibility.isEligible) {
      // Log rejected attempt
      await tx.auditEvent.create({
        data: {
          eventType: 'BALLOT_REJECTED',
          actorId: user.id,
          actorRole: user.role,
          electionId: election.id,
          outcome: 'REJECTED',
          details: JSON.stringify({ reason: 'Student is not eligible for this election' }),
          ipAddress,
        },
      });
      throw new Error('You are not registered as eligible for this election.');
    }

    if (eligibility.hasVoted) {
      await tx.auditEvent.create({
        data: {
          eventType: 'DUPLICATE_VOTE_ATTEMPT',
          actorId: user.id,
          actorRole: user.role,
          electionId: election.id,
          outcome: 'REJECTED',
          details: JSON.stringify({ reason: 'Student already cast a ballot' }),
          ipAddress,
        },
      });
      throw new Error('Duplicate vote rejected. A ballot has already been accepted for your student ID.');
    }

    // Atomically consume entitlement
    await tx.voterEligibility.update({
      where: {
        electionId_userId: {
          electionId: election.id,
          userId: user.id,
        },
      },
      data: {
        hasVoted: true,
        votedAt: now,
        receiptCode,
      },
    });

    // Determine deterministic leaf index
    const currentBallotCount = await tx.acceptedBallot.count({
      where: { electionId: election.id },
    });
    const leafIndex = currentBallotCount;

    // Calculate leaf hash
    const leafHash = hashBallotLeaf({
      ballotId,
      electionId: election.id,
      candidateId: candidate.id,
      receiptHash,
      version: '1.0',
    });

    // Insert accepted ballot (NO user/student link!)
    await tx.acceptedBallot.create({
      data: {
        id: ballotId,
        electionId: election.id,
        candidateId: candidate.id,
        leafHash,
        leafIndex,
        receiptHash,
        createdAt: now,
      },
    });

    // Fetch all existing leaf hashes plus this new one to recompute tree
    const allBallots = await tx.acceptedBallot.findMany({
      where: { electionId: election.id },
      orderBy: { leafIndex: 'asc' },
      select: { leafHash: true },
    });

    const leafHashes = allBallots.map((b) => b.leafHash);
    const tree = new MerkleTree(leafHashes);
    const newRoot = tree.getRoot();

    // Fetch previous checkpoint
    const lastCheckpoint = await tx.signedCheckpoint.findFirst({
      where: { electionId: election.id },
      orderBy: { sequenceNumber: 'desc' },
    });

    const nextSeq = (lastCheckpoint?.sequenceNumber ?? 0) + 1;
    const prevCheckpointHash = lastCheckpoint
      ? hashCheckpoint(lastCheckpoint as any)
      : '0000000000000000000000000000000000000000000000000000000000000000';

    const checkpointData: CheckpointData = {
      electionId: election.id,
      sequenceNumber: nextSeq,
      state: 'OPEN',
      merkleRoot: newRoot,
      ballotCount: leafHashes.length,
      previousCheckpointHash: prevCheckpointHash,
      createdAt: now.toISOString(),
      keyId: 'auditor-key-2026-v1',
    };

    const signedCheckpoint = signCheckpoint(checkpointData);

    await tx.signedCheckpoint.create({
      data: {
        electionId: election.id,
        sequenceNumber: signedCheckpoint.sequenceNumber,
        state: signedCheckpoint.state,
        merkleRoot: signedCheckpoint.merkleRoot,
        ballotCount: signedCheckpoint.ballotCount,
        previousCheckpointHash: signedCheckpoint.previousCheckpointHash,
        keyId: signedCheckpoint.keyId,
        signature: signedCheckpoint.signature,
        publishedToAuditor: true,
        createdAt: now,
      },
    });

    // Update election with new root and sequence
    await tx.election.update({
      where: { id: election.id },
      data: {
        merkleRoot: newRoot,
        checkpointSeq: nextSeq,
      },
    });

    // Append-only audit event (Safe: NO candidate choice logged!)
    await tx.auditEvent.create({
      data: {
        eventType: 'BALLOT_ACCEPTED',
        electionId: election.id,
        outcome: 'SUCCESS',
        details: JSON.stringify({
          leafIndex,
          ballotCount: leafHashes.length,
          newMerkleRoot: newRoot,
          checkpointSeq: nextSeq,
        }),
        ipAddress,
      },
    });

    return {
      success: true,
      receiptCode,
      ballotId,
      leafIndex,
      merkleRoot: newRoot,
      timestamp: now.toISOString(),
      electionTitle: election.title,
    };
  });

  return result;
}
