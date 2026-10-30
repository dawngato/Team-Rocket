import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import * as path from 'path';

export async function POST(): Promise<NextResponse> {
  return new Promise<NextResponse>((resolve) => {
    const scriptPath = path.join(process.cwd(), 'scripts', 'verify_election.py');
    const artifactDir = path.join(process.cwd(), 'artifacts', 'elec-senate-2026-rep');
    const manifestPath = path.join(artifactDir, 'election_manifest.json');
    const ballotsPath = path.join(artifactDir, 'accepted_ballots.jsonl');
    const checkpointPath = path.join(artifactDir, 'signed_checkpoint.json');
    const pubKeyPath = path.join(artifactDir, 'trusted_auditor_public_key.pem');

    const cmd = `python "${scriptPath}" --manifest "${manifestPath}" --ballots "${ballotsPath}" --checkpoint "${checkpointPath}" --public-key "${pubKeyPath}"`;

    exec(cmd, (error, stdout, stderr) => {
      resolve(
        NextResponse.json({
          success: !error,
          exitCode: error ? error.code || 1 : 0,
          stdout: stdout.toString(),
          stderr: stderr ? stderr.toString() : '',
        })
      );
    });
  });
}
