// Encrypts a user's AI key before it is stored. Server-only. AES-256-GCM: the ciphertext cannot be changed
// without detection, and it is bound to the user id, so a copied row will not decrypt for anyone else.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export interface SealedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
}

function keyFrom(secret: string | undefined): Buffer {
  if (!secret || secret.length < 32) {
    throw new Error('KEY_ENCRYPTION_SECRET must be set to at least 32 random characters.');
  }
  return createHash('sha256').update(secret).digest();
}

export function sealSecret(plain: string, userId: string, secret = process.env.KEY_ENCRYPTION_SECRET): SealedSecret {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv);
  cipher.setAAD(Buffer.from(userId, 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

export function openSecret(sealed: SealedSecret, userId: string, secret = process.env.KEY_ENCRYPTION_SECRET): string {
  const decipher = createDecipheriv('aes-256-gcm', keyFrom(secret), Buffer.from(sealed.iv, 'base64'));
  decipher.setAAD(Buffer.from(userId, 'utf8'));
  decipher.setAuthTag(Buffer.from(sealed.authTag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(sealed.ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

export function lastFour(key: string): string {
  return key.slice(-4);
}
