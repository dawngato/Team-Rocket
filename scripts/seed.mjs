import { PrismaClient } from '@prisma/client';
import { createHash, generateKeyPairSync, sign } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const prisma = new PrismaClient();

// Domain separation prefixes
const LEAF_PREFIX = 'CV:LEAF:v1:';
const NODE_PREFIX = 'CV:NODE:v1:';

function canonicalizeJson(obj) {
  const sortedKeys = Object.keys(obj).sort();
  const sortedObj = {};
  for (const key of sortedKeys) {
    const val = obj[key];
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      sortedObj[key] = JSON.parse(canonicalizeJson(val));
    } else {
      sortedObj[key] = val;
    }
  }
  return JSON.stringify(sortedObj);
}

function hashBallotLeaf(payload) {
  const canonical = canonicalizeJson({
    ballotId: payload.ballotId,
    candidateId: payload.candidateId,
    electionId: payload.electionId,
    receiptHash: payload.receiptHash,
    version: payload.version || '1.0',
  });
  return createHash('sha256').update(LEAF_PREFIX + canonical, 'utf8').digest('hex');
}

function hashInternalNode(left, right) {
  return createHash('sha256').update(NODE_PREFIX + left + right, 'utf8').digest('hex');
}

function buildMerkleTree(leafHashes) {
  if (leafHashes.length === 0) {
    return {
      root: createHash('sha256').update('CV:EMPTY_TREE:v1:', 'utf8').digest('hex'),
      layers: [[]],
    };
  }
  let currentLayer = [...leafHashes];
  const layers = [currentLayer];

  while (currentLayer.length > 1) {
    const nextLayer = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;
      nextLayer.push(hashInternalNode(left, right));
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  return { root: layers[layers.length - 1][0], layers };
}

function getProof(leafIndex, leafHashes, layers) {
  const proof = [];
  let currentIndex = leafIndex;

  for (let layerIdx = 0; layerIdx < layers.length - 1; layerIdx++) {
    const currentLayer = layers[layerIdx];
    const isRightSibling = currentIndex % 2 === 1;
    const siblingIndex = isRightSibling ? currentIndex - 1 : currentIndex + 1;

    if (siblingIndex < currentLayer.length) {
      proof.push({
        position: isRightSibling ? 'left' : 'right',
        hash: currentLayer[siblingIndex],
      });
    } else {
      proof.push({
        position: 'right',
        hash: currentLayer[currentIndex],
      });
    }
    currentIndex = Math.floor(currentIndex / 2);
  }

  return proof;
}

function ensureKeys() {
  const keysDir = path.join(process.cwd(), 'keys');
  if (!fs.existsSync(keysDir)) {
    fs.mkdirSync(keysDir, { recursive: true });
  }

  const privPath = path.join(keysDir, 'auditor_private_key.pem');
  const pubPath = path.join(keysDir, 'auditor_public_key.pem');

  if (fs.existsSync(privPath) && fs.existsSync(pubPath)) {
    return {
      privKey: fs.readFileSync(privPath, 'utf8'),
      pubKey: fs.readFileSync(pubPath, 'utf8'),
    };
  }

  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  fs.writeFileSync(privPath, privateKey);
  fs.writeFileSync(pubPath, publicKey);
  return { privKey: privateKey, pubKey: publicKey };
}

async function main() {
  console.log('Seeding Campus Vault database with realistic university data...');
  const { privKey, pubKey } = ensureKeys();

  // Clean existing data
  await prisma.auditEvent.deleteMany({});
  await prisma.verificationRun.deleteMany({});
  await prisma.signedCheckpoint.deleteMany({});
  await prisma.electionManifest.deleteMany({});
  await prisma.acceptedBallot.deleteMany({});
  await prisma.voterEligibility.deleteMany({});
  await prisma.candidate.deleteMany({});
  await prisma.election.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Create Users
  console.log('Creating users (Students, Administrators, Auditor)...');
  const users = await prisma.$transaction([
    // Admin
    prisma.user.create({
      data: {
        studentId: 'ADM-001',
        email: 'aris.thorne@veritas.edu',
        name: 'Dr. Aris Thorne',
        role: 'ADMIN',
        department: 'Electoral Board Secretariat',
        year: null,
      },
    }),
    prisma.user.create({
      data: {
        studentId: 'ADM-002',
        email: 'dean.jenkins@veritas.edu',
        name: 'Prof. Sarah Jenkins',
        role: 'ADMIN',
        department: 'Office of Student Affairs',
        year: null,
      },
    }),
    // Auditor
    prisma.user.create({
      data: {
        studentId: 'AUD-001',
        email: 'elena.rostova@auditing-standards.org',
        name: 'Elena Rostova',
        role: 'AUDITOR',
        department: 'Independent Civic Tech Audit Panel',
        year: null,
      },
    }),
    // Students
    prisma.user.create({
      data: {
        studentId: 'STU-2026-001',
        email: 'alex.chen@student.veritas.edu',
        name: 'Alex Chen',
        role: 'STUDENT',
        department: 'Computer Science & Engineering',
        year: 3,
      },
    }),
    prisma.user.create({
      data: {
        studentId: 'STU-2026-002',
        email: 'maya.patel@student.veritas.edu',
        name: 'Maya Patel',
        role: 'STUDENT',
        department: 'School of Law',
        year: 2,
      },
    }),
    prisma.user.create({
      data: {
        studentId: 'STU-2026-003',
        email: 'marcus.vance@student.veritas.edu',
        name: 'Marcus Vance',
        role: 'STUDENT',
        department: 'Business & Economics',
        year: 4,
      },
    }),
    prisma.user.create({
      data: {
        studentId: 'STU-2026-004',
        email: 'chloe.dubois@student.veritas.edu',
        name: 'Chloe Dubois',
        role: 'STUDENT',
        department: 'Computer Science & Engineering',
        year: 2,
      },
    }),
    prisma.user.create({
      data: {
        studentId: 'STU-2026-005',
        email: 'liam.oconnor@student.veritas.edu',
        name: "Liam O'Connor",
        role: 'STUDENT',
        department: 'College of Arts & Sciences',
        year: 1,
      },
    }),
    prisma.user.create({
      data: {
        studentId: 'STU-2026-006',
        email: 'sofia.rodriguez@student.veritas.edu',
        name: 'Sofia Rodriguez',
        role: 'STUDENT',
        department: 'Civil & Environmental Engineering',
        year: 3,
      },
    }),
    prisma.user.create({
      data: {
        studentId: 'STU-2026-007',
        email: 'tariq.mansoor@student.veritas.edu',
        name: 'Tariq Al-Mansoor',
        role: 'STUDENT',
        department: 'Computer Science & Engineering',
        year: 4,
      },
    }),
    prisma.user.create({
      data: {
        studentId: 'STU-2026-008',
        email: 'emma.katz@student.veritas.edu',
        name: 'Emma Katz',
        role: 'STUDENT',
        department: 'School of Law',
        year: 3,
      },
    }),
  ]);

  const studentUsers = users.filter((u) => u.role === 'STUDENT');

  // 2. Create Elections
  console.log('Creating elections across states...');

  // Election 1: Active Election (OPEN)
  const electionOpen = await prisma.election.create({
    data: {
      id: 'elec-spring-2026-pres',
      title: 'Spring 2026 Student Government President',
      description:
        'General campus election for the Executive President of the Veritas Metropolitan Student Union. Voters elect the chief student representative for the 2026-2027 academic year.',
      department: 'University Wide',
      academicSession: '2025-2026',
      category: 'STUDENT_GOVERNMENT',
      status: 'OPEN',
      startTime: new Date(Date.now() - 36 * 3600 * 1000), // 36 hours ago
      endTime: new Date(Date.now() + 48 * 3600 * 1000), // 48 hours in future
      resultsPolicy: 'RESTRICTED_UNTIL_CLOSED',
      merkleRoot: null,
      checkpointSeq: 1,
    },
  });

  // Candidates for Election 1
  const cand1A = await prisma.candidate.create({
    data: {
      id: 'cand-pres-01',
      electionId: electionOpen.id,
      name: 'Jordan Blake',
      department: 'Computer Science & Engineering',
      academicYear: 3,
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      shortBio: 'Junior studying CS and AI ethics. Vice President of the ACM Chapter.',
      manifesto:
        'Championing 24/7 digital campus services, transparent funding allocation for student societies, expanded campus WiFi infrastructure, and subsidized commuter transit passes.',
      campaignPriorities: JSON.stringify([
        'Subsidized public transit cards for off-campus students',
        '24/7 Library & Computer Lab Access',
        'Direct student oversight of university technology fees',
      ]),
      websiteUrl: 'https://jordanforpresident2026.org',
      ballotOrder: 1,
    },
  });

  const cand1B = await prisma.candidate.create({
    data: {
      id: 'cand-pres-02',
      electionId: electionOpen.id,
      name: 'Samantha Lee',
      department: 'School of Law',
      academicYear: 2,
      photoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
      shortBio: 'Law scholar focusing on civil advocacy, campus equity, and mental healthcare reform.',
      manifesto:
        'Expanding licensed mental health counselors on campus, establishing a Student Legal Clinic, and eliminating hidden course material fees through universal open educational resources.',
      campaignPriorities: JSON.stringify([
        'Tripling campus mental health counseling appointments',
        'Free course textbooks via open educational resources',
        'Fair wage protections for graduate teaching assistants',
      ]),
      websiteUrl: 'https://samanthalee.law.veritas.edu',
      ballotOrder: 2,
    },
  });

  const cand1C = await prisma.candidate.create({
    data: {
      id: 'cand-pres-03',
      electionId: electionOpen.id,
      name: 'Devante Washington',
      department: 'Business & Economics',
      academicYear: 4,
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
      shortBio: 'Finance senior, varsity track captain, and founder of the Social Impact Venture Fund.',
      manifesto:
        'Modernizing campus dining with zero food waste, accelerating green campus energy transition, and creating paid incubator fellowships for student startups.',
      campaignPriorities: JSON.stringify([
        'Zero waste & locally sourced cafeteria nutrition',
        '100% renewable power commitment for campus facilities',
        '$150,000 venture grant pool for student ventures',
      ]),
      ballotOrder: 3,
    },
  });

  // Assign eligibility for all 8 students to Election 1
  for (const student of studentUsers) {
    await prisma.voterEligibility.create({
      data: {
        electionId: electionOpen.id,
        studentId: student.studentId,
        userId: student.id,
        isEligible: true,
        hasVoted: false,
      },
    });
  }

  // Pre-cast ballots for 5 students in Election 1 (realistic active turnout: 5 / 8 = 62.5%)
  const openBallotChoices = [
    { studentIndex: 1, cand: cand1A },
    { studentIndex: 2, cand: cand1B },
    { studentIndex: 3, cand: cand1B },
    { studentIndex: 4, cand: cand1C },
    { studentIndex: 5, cand: cand1A },
  ];

  const openBallotsLeaves = [];
  let openIndex = 0;
  for (const item of openBallotChoices) {
    const student = studentUsers[item.studentIndex];
    const receiptCode = 'CV-REC-' + createHash('sha256').update(student.studentId + electionOpen.id).digest('hex').substring(0, 12).toUpperCase();
    const receiptHash = createHash('sha256').update(receiptCode).digest('hex');
    const ballotId = `bal-open-${openIndex + 1}`;

    const leafPayload = {
      ballotId,
      electionId: electionOpen.id,
      candidateId: item.cand.id,
      receiptHash,
      version: '1.0',
    };
    const leafHash = hashBallotLeaf(leafPayload);
    openBallotsLeaves.push(leafHash);

    // Update eligibility
    await prisma.voterEligibility.update({
      where: {
        electionId_userId: {
          electionId: electionOpen.id,
          userId: student.id,
        },
      },
      data: {
        hasVoted: true,
        votedAt: new Date(Date.now() - (5 - openIndex) * 3600 * 1000),
        receiptCode,
      },
    });

    // Create accepted ballot (privacy preserved: NO studentId!)
    await prisma.acceptedBallot.create({
      data: {
        id: ballotId,
        electionId: electionOpen.id,
        candidateId: item.cand.id,
        leafHash,
        leafIndex: openIndex,
        receiptHash,
        createdAt: new Date(Date.now() - (5 - openIndex) * 3600 * 1000),
      },
    });
    openIndex++;
  }

  // Merkle tree for Election 1
  const openMerkle = buildMerkleTree(openBallotsLeaves);
  await prisma.election.update({
    where: { id: electionOpen.id },
    data: { merkleRoot: openMerkle.root },
  });

  // Checkpoint for Election 1
  const openCheckpointData = {
    electionId: electionOpen.id,
    sequenceNumber: 1,
    state: 'OPEN',
    merkleRoot: openMerkle.root,
    ballotCount: openBallotsLeaves.length,
    previousCheckpointHash: '0000000000000000000000000000000000000000000000000000000000000000',
    createdAt: new Date().toISOString(),
    keyId: 'auditor-key-2026-v1',
  };
  const openSignable = canonicalizeJson(openCheckpointData);
  const openSig = sign(null, Buffer.from(openSignable, 'utf8'), privKey).toString('hex');

  await prisma.signedCheckpoint.create({
    data: {
      ...openCheckpointData,
      createdAt: new Date(openCheckpointData.createdAt),
      signature: openSig,
    },
  });

  // -------------------------------------------------------------
  // Election 2: Fully Closed, Verified & PUBLISHED Election
  // -------------------------------------------------------------
  const electionPublished = await prisma.election.create({
    data: {
      id: 'elec-senate-2026-rep',
      title: 'University Senate Faculty-Student Representative 2026',
      description:
        'Official election for the voting student delegates on the University Academic Senate, determining curriculum oversight and academic integrity standards.',
      department: 'University Wide',
      academicSession: '2025-2026',
      category: 'COUNCIL',
      status: 'PUBLISHED',
      startTime: new Date(Date.now() - 7 * 86400 * 1000),
      endTime: new Date(Date.now() - 2 * 86400 * 1000),
      resultsPolicy: 'RESTRICTED_UNTIL_CLOSED',
      merkleRoot: null,
      checkpointSeq: 2,
      publishedAt: new Date(Date.now() - 1 * 86400 * 1000),
    },
  });

  const cand2A = await prisma.candidate.create({
    data: {
      id: 'cand-senate-01',
      electionId: electionPublished.id,
      name: 'Dr. Alicia Morgan',
      department: 'Computer Science & Engineering',
      academicYear: 4,
      photoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
      shortBio: 'Doctoral student researcher in Distributed Computing and Academic Senate committee member.',
      manifesto:
        'Strengthening research funding transparency, creating interdisciplinary project grants, and enforcing reasonable grading turnaround deadlines across all faculties.',
      campaignPriorities: JSON.stringify([
        'Interdisciplinary PhD & undergraduate research fellowships',
        'Strict 14-day grading feedback deadline policy',
        'Hybrid lecture recording requirements for accessibility',
      ]),
      ballotOrder: 1,
    },
  });

  const cand2B = await prisma.candidate.create({
    data: {
      id: 'cand-senate-02',
      electionId: electionPublished.id,
      name: 'Prof. Kenneth Brooks',
      department: 'School of Law',
      academicYear: 3,
      photoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
      shortBio: 'JD candidate specializing in constitutional law and university governance jurisprudence.',
      manifesto:
        'Protecting student speech, reforming the honor court with independent student ombudsmen, and establishing standardized course syllabus policies.',
      campaignPriorities: JSON.stringify([
        'Independent student ombudsman office',
        'Honor code trial procedural protections',
        'Tuition freeze for students making satisfactory academic progress',
      ]),
      ballotOrder: 2,
    },
  });

  // Assign eligibility for all 8 students to Election 2
  for (const student of studentUsers) {
    await prisma.voterEligibility.create({
      data: {
        electionId: electionPublished.id,
        studentId: student.studentId,
        userId: student.id,
        isEligible: true,
        hasVoted: false,
      },
    });
  }

  // Pre-cast ballots for all 8 students
  const pubBallotsLeaves = [];
  const exportBallotsList = [];
  const publishedTally = { [cand2A.id]: 0, [cand2B.id]: 0 };

  for (let idx = 0; idx < studentUsers.length; idx++) {
    const student = studentUsers[idx];
    const chosenCand = idx % 3 === 0 ? cand2B : cand2A; // 5 for A, 3 for B
    publishedTally[chosenCand.id]++;

    const receiptCode = 'CV-SENATE-' + createHash('sha256').update(student.studentId + electionPublished.id).digest('hex').substring(0, 10).toUpperCase();
    const receiptHash = createHash('sha256').update(receiptCode).digest('hex');
    const ballotId = `bal-senate-${idx + 1}`;

    const leafPayload = {
      ballotId,
      electionId: electionPublished.id,
      candidateId: chosenCand.id,
      receiptHash,
      version: '1.0',
    };
    const leafHash = hashBallotLeaf(leafPayload);
    pubBallotsLeaves.push(leafHash);
    exportBallotsList.push(leafPayload);

    await prisma.voterEligibility.update({
      where: {
        electionId_userId: {
          electionId: electionPublished.id,
          userId: student.id,
        },
      },
      data: {
        hasVoted: true,
        votedAt: new Date(Date.now() - 3 * 86400 * 1000 + idx * 3600 * 1000),
        receiptCode,
      },
    });

    await prisma.acceptedBallot.create({
      data: {
        id: ballotId,
        electionId: electionPublished.id,
        candidateId: chosenCand.id,
        leafHash,
        leafIndex: idx,
        receiptHash,
        createdAt: new Date(Date.now() - 3 * 86400 * 1000 + idx * 3600 * 1000),
      },
    });
  }

  const pubMerkle = buildMerkleTree(pubBallotsLeaves);
  await prisma.election.update({
    where: { id: electionPublished.id },
    data: { merkleRoot: pubMerkle.root },
  });

  const pubCheckpointData = {
    electionId: electionPublished.id,
    sequenceNumber: 2,
    state: 'PUBLISHED',
    merkleRoot: pubMerkle.root,
    ballotCount: pubBallotsLeaves.length,
    previousCheckpointHash: '0000000000000000000000000000000000000000000000000000000000000000',
    createdAt: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
    keyId: 'auditor-key-2026-v1',
  };
  const pubSignable = canonicalizeJson(pubCheckpointData);
  const pubSig = sign(null, Buffer.from(pubSignable, 'utf8'), privKey).toString('hex');

  await prisma.signedCheckpoint.create({
    data: {
      ...pubCheckpointData,
      createdAt: new Date(pubCheckpointData.createdAt),
      signature: pubSig,
    },
  });

  // Create Election Manifest for Election 2
  const manifestData = {
    electionId: electionPublished.id,
    title: electionPublished.title,
    category: electionPublished.category,
    department: electionPublished.department,
    academicSession: electionPublished.academicSession,
    protocolVersion: '1.0',
    ballotCount: pubBallotsLeaves.length,
    merkleRoot: pubMerkle.root,
    tally: publishedTally,
    candidates: [
      { id: cand2A.id, name: cand2A.name, department: cand2A.department },
      { id: cand2B.id, name: cand2B.name, department: cand2B.department },
    ],
    publishedAt: new Date(Date.now() - 1 * 86400 * 1000).toISOString(),
  };

  const manifestCanonical = canonicalizeJson(manifestData);
  const manifestHash = createHash('sha256').update(manifestCanonical).digest('hex');
  const manifestSig = sign(null, Buffer.from(manifestCanonical, 'utf8'), privKey).toString('hex');

  await prisma.electionManifest.create({
    data: {
      electionId: electionPublished.id,
      canonicalManifestJson: manifestCanonical,
      manifestHash,
      signature: manifestSig,
    },
  });

  // Export artifacts directory for Election 2 so verify_election.py can run out-of-the-box
  const exportDir = path.join(process.cwd(), 'artifacts', electionPublished.id);
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }

  fs.writeFileSync(path.join(exportDir, 'election_manifest.json'), JSON.stringify(manifestData, null, 2));
  fs.writeFileSync(path.join(exportDir, 'signed_checkpoint.json'), JSON.stringify({ ...pubCheckpointData, signature: pubSig }, null, 2));
  fs.writeFileSync(
    path.join(exportDir, 'accepted_ballots.jsonl'),
    exportBallotsList.map((b) => JSON.stringify(b)).join('\n') + '\n'
  );
  fs.writeFileSync(path.join(exportDir, 'trusted_auditor_public_key.pem'), pubKey);

  // -------------------------------------------------------------
  // Election 3: Scheduled (Upcoming)
  // -------------------------------------------------------------
  await prisma.election.create({
    data: {
      id: 'elec-computing-chair-2026',
      title: 'College of Computing Student Chair 2026',
      description:
        'Representative chair for graduate and undergraduate computing programs, liaising with curriculum committees on AI and cyber courses.',
      department: 'Computer Science & Engineering',
      academicSession: '2025-2026',
      category: 'FACULTY_REP',
      status: 'SCHEDULED',
      startTime: new Date(Date.now() + 3 * 86400 * 1000),
      endTime: new Date(Date.now() + 7 * 86400 * 1000),
      resultsPolicy: 'RESTRICTED_UNTIL_CLOSED',
      merkleRoot: null,
      checkpointSeq: 0,
    },
  });

  // -------------------------------------------------------------
  // Election 4: Draft
  // -------------------------------------------------------------
  await prisma.election.create({
    data: {
      id: 'elec-sustainability-draft',
      title: 'Campus Sustainability Council Delegate 2026',
      description: 'Draft proposal for the newly chartered campus environmental board.',
      department: 'University Wide',
      academicSession: '2025-2026',
      category: 'CLUB',
      status: 'DRAFT',
      startTime: new Date(Date.now() + 10 * 86400 * 1000),
      endTime: new Date(Date.now() + 14 * 86400 * 1000),
      resultsPolicy: 'RESTRICTED_UNTIL_CLOSED',
      merkleRoot: null,
      checkpointSeq: 0,
    },
  });

  // Audit Events
  await prisma.auditEvent.createMany({
    data: [
      {
        eventType: 'SYSTEM_INITIALIZED',
        actorRole: 'SYSTEM',
        outcome: 'SUCCESS',
        details: JSON.stringify({ message: 'Campus Vault cryptographic root initialized.' }),
      },
      {
        eventType: 'ELECTION_OPENED',
        electionId: electionOpen.id,
        actorRole: 'ADMIN',
        outcome: 'SUCCESS',
        details: JSON.stringify({ title: electionOpen.title }),
      },
      {
        eventType: 'CHECKPOINT_PUBLISHED',
        electionId: electionPublished.id,
        actorRole: 'AUDITOR',
        outcome: 'SUCCESS',
        details: JSON.stringify({
          sequenceNumber: 2,
          state: 'PUBLISHED',
          merkleRoot: pubMerkle.root,
        }),
      },
    ],
  });

  console.log('Seed completed successfully!');
  console.log(`Generated export artifacts in: ${exportDir}`);
}

main()
  .catch((e) => {
    console.error('Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
