import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

/**
 * Hashes a plaintext password using PBKDF2 with SHA-512 and a random 16-byte salt.
 * Produces format: salt:hash
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verifies a plaintext password against a stored salt:hash string.
 * Uses timingSafeEqual to protect against timing attacks.
 */
export function verifyPassword(password: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !storedHash.includes(':')) {
    return false;
  }
  try {
    const [salt, expectedHash] = storedHash.split(':');
    const calculatedHash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    
    const bufA = Buffer.from(calculatedHash, 'hex');
    const bufB = Buffer.from(expectedHash, 'hex');
    
    if (bufA.length !== bufB.length) {
      return false;
    }
    
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
