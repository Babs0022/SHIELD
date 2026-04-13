import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;

/**
 * Derives an encryption key from a password using PBKDF2
 */
function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha512');
}

/**
 * Encrypts content using AES-256-GCM with a key derived from the API key
 * Returns encrypted data with salt, IV, and auth tag prepended
 */
export function encryptContent(content: Buffer | string, apiKey: string): {
  encryptedData: Buffer;
  decryptionKey: string;
} {
  // Generate random salt and IV
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);

  // Derive encryption key from API key
  const key = deriveKey(apiKey, salt);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  // Encrypt content
  const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
  const encrypted = Buffer.concat([cipher.update(contentBuffer), cipher.final()]);

  // Get authentication tag
  const tag = cipher.getAuthTag();

  // Combine: salt + iv + tag + encryptedData
  const encryptedData = Buffer.concat([salt, iv, tag, encrypted]);

  // Generate random decryption key for the content (different from API key)
  // This is what end users will need to decrypt
  const decryptionKey = crypto.randomBytes(32).toString('base64');

  return {
    encryptedData,
    decryptionKey,
  };
}

/**
 * Decrypts content using AES-256-GCM
 * Requires the same API key used for encryption
 */
export function decryptContent(encryptedData: Buffer, apiKey: string): Buffer {
  // Extract components
  const salt = encryptedData.subarray(0, SALT_LENGTH);
  const iv = encryptedData.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = encryptedData.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = encryptedData.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

  // Derive key
  const key = deriveKey(apiKey, salt);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  // Decrypt
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Generates a secure random encryption key for content
 * This is separate from the API key and is what content owners use
 */
export function generateContentKey(): string {
  return crypto.randomBytes(32).toString('base64');
}

/**
 * Encrypts content with a specific content key (not the API key)
 * Used for end-to-end encryption where the developer doesn't have the content key
 */
export function encryptWithContentKey(
  content: Buffer | string,
  contentKey: string
): {
  encryptedData: Buffer;
  iv: string;
  tag: string;
} {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(contentKey, 'base64');

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
  const encrypted = Buffer.concat([cipher.update(contentBuffer), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encryptedData: encrypted,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

/**
 * Decrypts content with a content key
 */
export function decryptWithContentKey(
  encryptedData: Buffer,
  contentKey: string,
  iv: string,
  tag: string
): Buffer {
  const key = Buffer.from(contentKey, 'base64');
  const ivBuffer = Buffer.from(iv, 'base64');
  const tagBuffer = Buffer.from(tag, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(tagBuffer);

  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}

/**
 * Hashes content for integrity verification
 */
export function hashContent(content: Buffer | string): string {
  const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
  return crypto.createHash('sha256').update(contentBuffer).digest('hex');
}

/**
 * Generates a unique content identifier
 */
export function generateContentId(): string {
  return crypto.randomBytes(16).toString('hex');
}
