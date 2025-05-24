import { Buffer } from 'buffer';

// Non-secret initialization vector - doesn't need to be secret but should be unique
const IV_LENGTH = 12;
// Storage key for the encryption key
const ENCRYPTION_KEY_STORAGE = 'ks_encryption_key';

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
 */
export const encryptData = async (data: string): Promise<string> => {
  try {
    const key = await getOrCreateEncryptionKey();

    // Generate a random initialization vector
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Encode the data
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, dataBuffer);

    // Combine IV and encrypted data
    const result = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encryptedBuffer), iv.length);

    // Convert to base64 for storage
    return Buffer.from(result).toString('base64');
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypts encrypted data
 */
export const decryptData = async (encryptedData: string): Promise<string> => {
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
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('Decryption failed:', error);
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
 * Migrates old base64 encoded password to new encrypted format
 */
export const migratePassword = async (): Promise<void> => {
  const savedUsername = localStorage.getItem('rememberedUsername');
  const savedPassword = localStorage.getItem('rememberedPassword');

  if (savedUsername && savedPassword && !isEncrypted(savedPassword)) {
    try {
      // This is an old base64 encoded password
      const decodedPassword = atob(savedPassword);

      // Encrypt it with the new method
      const encryptedPassword = await encryptData(decodedPassword);

      // Store the encrypted password
      localStorage.setItem('rememberedPassword', encryptedPassword);

      console.log('Successfully migrated saved password to secure storage');
    } catch (error) {
      console.error('Error migrating password:', error);
      // If migration fails, remove the insecure password
      localStorage.removeItem('rememberedPassword');
    }
  }
};
