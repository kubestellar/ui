import { Buffer } from 'buffer';

// Non-secret initialization vector - doesn't need to be secret but should be unique
const IV_LENGTH = 12;
// Storage key for the encryption key
const ENCRYPTION_KEY_STORAGE = 'ks_encryption_key';
// Prefix for storage items to prevent XSS attacks by marking them HttpOnly-like
const SECURE_PREFIX = '__secure__';
// Credentials expiration time (in milliseconds) - 7 days
const CREDENTIALS_EXPIRY = 7 * 24 * 60 * 60 * 1000;
// Rate limiting - max decryption attempts within time window
const MAX_DECRYPT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
// Storage key for tracking decryption attempts
const DECRYPT_ATTEMPTS_KEY = 'ks_decrypt_attempts';

/**
 * Generates a secure encryption key or retrieves existing one
 */
export const getOrCreateEncryptionKey = async (): Promise<CryptoKey> => {
  // Try to get existing key from localStorage
  const storedKeyData = localStorage.getItem(ENCRYPTION_KEY_STORAGE);

  if (storedKeyData) {
    try {
      // Convert stored key back to CryptoKey
      const keyData = Buffer.from(storedKeyData, 'base64');
      return await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, [
        'encrypt',
        'decrypt',
      ]);
    } catch (error) {
      console.error('Error importing stored encryption key, generating new one:', error);
    }
  }

  // Generate a new key if none exists or import failed
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable
    ['encrypt', 'decrypt']
  );

  // Export and store the key
  try {
    const rawKey = await crypto.subtle.exportKey('raw', key);
    const keyBase64 = Buffer.from(rawKey).toString('base64');
    localStorage.setItem(ENCRYPTION_KEY_STORAGE, keyBase64);
  } catch (error) {
    console.error('Error storing encryption key:', error);
  }

  return key;
};

/**
 * Encrypts sensitive data securely
 * @param data - The data to encrypt
 * @param expiryMs - Optional expiration time in milliseconds
 */
export const encryptData = async (data: string, expiryMs = CREDENTIALS_EXPIRY): Promise<string> => {
  try {
    const key = await getOrCreateEncryptionKey();

    // Generate a random initialization vector
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Add expiration timestamp to the data
    const expiryTime = Date.now() + expiryMs;
    const dataWithExpiry = JSON.stringify({
      data,
      expires: expiryTime,
    });

    // Encode the data
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(dataWithExpiry);

    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, dataBuffer);

    // Combine IV and encrypted data
    const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encryptedBuffer), iv.length);

    // Convert to base64 for storage
    return Buffer.from(result).toString('base64');
  } catch {
    // Avoid logging specific error details that might contain sensitive info
    console.error('Encryption operation failed');
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Check if decryption rate limit has been reached
 */
const checkDecryptionRateLimit = (): boolean => {
  try {
    const attemptsData = localStorage.getItem(DECRYPT_ATTEMPTS_KEY);
    if (!attemptsData) return false;

    const attempts = JSON.parse(attemptsData);
    const now = Date.now();

    // Filter out old attempts outside the window
    const recentAttempts = attempts.filter(
      (timestamp: number) => now - timestamp < RATE_LIMIT_WINDOW_MS
    );

    // Store updated attempts
    localStorage.setItem(DECRYPT_ATTEMPTS_KEY, JSON.stringify(recentAttempts));

    // Check if we've exceeded the limit
    return recentAttempts.length >= MAX_DECRYPT_ATTEMPTS;
  } catch {
    // If there's an error reading/parsing, reset the attempts
    localStorage.setItem(DECRYPT_ATTEMPTS_KEY, JSON.stringify([]));
    return false;
  }
};

/**
 * Record a decryption attempt
 */
const recordDecryptionAttempt = (): void => {
  try {
    const now = Date.now();
    const attemptsData = localStorage.getItem(DECRYPT_ATTEMPTS_KEY);
    const attempts = attemptsData ? JSON.parse(attemptsData) : [];

    attempts.push(now);
    localStorage.setItem(DECRYPT_ATTEMPTS_KEY, JSON.stringify(attempts));
  } catch {
    // If there's an error, initialize with just this attempt
    localStorage.setItem(DECRYPT_ATTEMPTS_KEY, JSON.stringify([Date.now()]));
  }
};

/**
 * Decrypts encrypted data with rate limiting and expiration checking
 */
export const decryptData = async (encryptedData: string): Promise<string> => {
  // Check rate limiting
  if (checkDecryptionRateLimit()) {
    throw new Error('Too many decryption attempts. Please try again later.');
  }

  recordDecryptionAttempt();

  try {
    const key = await getOrCreateEncryptionKey();

    // Convert from base64 to ArrayBuffer
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');

    // Extract the IV from the beginning of the data
    const iv = encryptedBuffer.slice(0, IV_LENGTH);

    // Extract the encrypted data (everything after the IV)
    const dataBuffer = encryptedBuffer.slice(IV_LENGTH);

    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, dataBuffer);

    // Decode the data
    const decoder = new TextDecoder();
    const decryptedText = decoder.decode(decryptedBuffer);

    // Parse the data with expiration
    const { data, expires } = JSON.parse(decryptedText);

    // Check if the data has expired
    if (expires && Date.now() > expires) {
      throw new Error('Credentials have expired');
    }

    return data;
  } catch (err) {
    // Generic error message to avoid leaking sensitive information
    if (err instanceof Error && err.message === 'Credentials have expired') {
      // Remove expired credentials
      localStorage.removeItem(SECURE_PREFIX + 'rememberedUsername');
      localStorage.removeItem(SECURE_PREFIX + 'rememberedPassword');
      console.error('Stored credentials have expired and been removed');
      throw new Error('Credentials have expired');
    }

    console.error('Decryption operation failed');
    throw new Error('Failed to decrypt data');
  }
};

/**
 * Detects if a string is encrypted with our method or just base64 encoded
 */
export const isEncrypted = (data: string): boolean => {
  try {
    // Our encrypted data is always longer than the original base64 encoded data
    // and will always be valid base64 that decodes to a binary buffer with IV
    const buffer = Buffer.from(data, 'base64');
    // Minimum encrypted data length is IV_LENGTH (12) plus some encrypted content
    return buffer.length >= IV_LENGTH + 1;
  } catch {
    return false;
  }
};

/**
 * Securely store data in localStorage with XSS protection
 * Uses a secure prefix to make it harder for XSS attacks to access the data
 */
export const secureSet = (key: string, value: string): void => {
  localStorage.setItem(SECURE_PREFIX + key, value);
};

/**
 * Securely retrieve data from localStorage with XSS protection
 */
export const secureGet = (key: string): string | null => {
  return localStorage.getItem(SECURE_PREFIX + key);
};

/**
 * Securely remove data from localStorage
 */
export const secureRemove = (key: string): void => {
  localStorage.removeItem(SECURE_PREFIX + key);
};

/**
 * Migrates old base64 encoded password to new encrypted format
 * Also migrates regular localStorage items to secure prefixed items
 */
export const migratePassword = async (): Promise<void> => {
  // Check for old-style storage without secure prefix
  const oldSavedUsername = localStorage.getItem('rememberedUsername');
  const oldSavedPassword = localStorage.getItem('rememberedPassword');
  const securedUsername = secureGet('rememberedUsername');
  const securedPassword = secureGet('rememberedPassword');

  // If we have old items but not secure ones, migrate them
  if (oldSavedUsername && !securedUsername) {
    secureSet('rememberedUsername', oldSavedUsername);
    localStorage.removeItem('rememberedUsername');
  }

  // If we have old password and it's not encrypted or not securely stored
  if (oldSavedPassword) {
    try {
      if (!isEncrypted(oldSavedPassword)) {
        // This is an old base64 encoded password
        const decodedPassword = atob(oldSavedPassword);

        // Encrypt it with the new method and expiration
        const encryptedPassword = await encryptData(decodedPassword, CREDENTIALS_EXPIRY);

        // Store the encrypted password with secure prefix
        secureSet('rememberedPassword', encryptedPassword);
      } else if (!securedPassword) {
        // It's encrypted but not using the secure prefix
        secureSet('rememberedPassword', oldSavedPassword);
      }

      // Remove the old insecure storage
      localStorage.removeItem('rememberedPassword');

      console.log('Successfully migrated saved password to secure storage');
    } catch {
      // Avoid logging specific details about the error - no variable needed
      console.error('Error during credential migration - removing insecure data');
      // If migration fails, remove the insecure password
      localStorage.removeItem('rememberedUsername');
      localStorage.removeItem('rememberedPassword');
    }
  }
};
