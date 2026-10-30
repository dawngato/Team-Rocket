import { generateKeyPairSync, sign, verify, KeyObject, createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { canonicalizeJson } from './merkle';

export interface CheckpointData {
  electionId: string;
  sequenceNumber: number;
  state: string;
  merkleRoot: string;
  ballotCount: number;
  previousCheckpointHash: string;
  createdAt: string;
  keyId: string;
}

export interface SignedCheckpointPayload extends CheckpointData {
  signature: string;
}

const KEYS_DIR = path.join(process.cwd(), 'keys');
const PRIV_KEY_PATH = path.join(KEYS_DIR, 'auditor_private_key.pem');
const PUB_KEY_PATH = path.join(KEYS_DIR, 'auditor_public_key.pem');

/**
 * Ensures auditor Ed25519 signing keys exist.
 * If not, generates a stable keypair and writes PEM files to `keys/`.
 */
export function ensureAuditorKeys(): { publicKeyPem: string; privateKeyPem: string } {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  if (fs.existsSync(PRIV_KEY_PATH) && fs.existsSync(PUB_KEY_PATH)) {
    const privateKeyPem = fs.readFileSync(PRIV_KEY_PATH, 'utf8');
    const publicKeyPem = fs.readFileSync(PUB_KEY_PATH, 'utf8');
    return { publicKeyPem, privateKeyPem };
  }

  // Generate Ed25519 keypair
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  fs.writeFileSync(PRIV_KEY_PATH, privateKey);
  fs.writeFileSync(PUB_KEY_PATH, publicKey);

  return { publicKeyPem: publicKey, privateKeyPem: privateKey };
}

/**
 * Get canonical string for signing a checkpoint
 */
export function checkpointToSignableString(data: CheckpointData): string {
  return canonicalizeJson({
    ballotCount: data.ballotCount,
    createdAt: data.createdAt,
    electionId: data.electionId,
    keyId: data.keyId,
    merkleRoot: data.merkleRoot,
    previousCheckpointHash: data.previousCheckpointHash,
    sequenceNumber: data.sequenceNumber,
    state: data.state,
  });
}

/**
 * Compute SHA-256 hash of a checkpoint
 */
export function hashCheckpoint(checkpoint: SignedCheckpointPayload): string {
  const signable = checkpointToSignableString(checkpoint);
  return createHash('sha256')
    .update('CV:CHECKPOINT:v1:' + signable, 'utf8')
    .digest('hex');
}

/**
 * Sign checkpoint with Ed25519 private key
 */
export function signCheckpoint(data: CheckpointData, privateKeyPem?: string): SignedCheckpointPayload {
  const keys = ensureAuditorKeys();
  const privKey = privateKeyPem || keys.privateKeyPem;
  const dataString = checkpointToSignableString(data);
  const signatureBuffer = sign(null, Buffer.from(dataString, 'utf8'), privKey);
  const signatureHex = signatureBuffer.toString('hex');

  return {
    ...data,
    signature: signatureHex,
  };
}

/**
 * Verify checkpoint Ed25519 signature
 */
export function verifyCheckpointSignature(
  checkpoint: SignedCheckpointPayload,
  publicKeyPem?: string
): boolean {
  try {
    const keys = ensureAuditorKeys();
    const pubKey = publicKeyPem || keys.publicKeyPem;
    const { signature, ...data } = checkpoint;
    const dataString = checkpointToSignableString(data);
    const signatureBuffer = Buffer.from(signature, 'hex');

    return verify(null, Buffer.from(dataString, 'utf8'), pubKey, signatureBuffer);
  } catch (err) {
    return false;
  }
}
