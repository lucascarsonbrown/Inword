/**
 * Client-Side Encryption Utilities
 *
 * Uses AES-GCM for authenticated encryption of user data.
 * All encryption/decryption happens on the device.
 * Keys never leave the device unless explicitly backed up by user.
 */

import * as Crypto from "expo-crypto";

// =====================================================
// CONSTANTS
// =====================================================
const KEY_SIZE = 256; // 256-bit AES key
const IV_SIZE = 12; // 96-bit IV for GCM (recommended)
const ALGORITHM = "AES-GCM";
const ENCODING = "base64"; // For storing binary data as text

// =====================================================
// KEY GENERATION
// =====================================================

/**
 * Generate a new random 256-bit encryption key
 * @returns Base64-encoded key (44 characters)
 */
export async function generateEncryptionKey(): Promise<string> {
  const randomBytes = await Crypto.getRandomBytesAsync(KEY_SIZE / 8); // 32 bytes
  return arrayBufferToBase64(randomBytes);
}

// =====================================================
// ENCRYPTION
// =====================================================

/**
 * Encrypt a plaintext string using AES-GCM
 * @param plaintext - The data to encrypt
 * @param key - Base64-encoded 256-bit key
 * @returns Base64-encoded ciphertext in format: IV:AuthTag:Ciphertext
 */
export async function encrypt(plaintext: string, key: string): Promise<string> {
  try {
    // Generate random IV
    const iv = await Crypto.getRandomBytesAsync(IV_SIZE);

    // Convert key from base64 to bytes
    const keyBytes = base64ToArrayBuffer(key);

    // Convert plaintext to bytes
    const plaintextBytes = stringToArrayBuffer(plaintext);

    // Import key for Web Crypto API
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: ALGORITHM },
      false,
      ["encrypt"]
    );

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      cryptoKey,
      plaintextBytes
    );

    // GCM produces: ciphertext + 16-byte auth tag (already concatenated)
    // Format: IV:Ciphertext (auth tag is embedded in ciphertext)
    const ivBase64 = arrayBufferToBase64(iv);
    const ciphertextBase64 = arrayBufferToBase64(encrypted);

    return `${ivBase64}:${ciphertextBase64}`;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

// =====================================================
// DECRYPTION
// =====================================================

/**
 * Decrypt a ciphertext string using AES-GCM
 * @param ciphertext - Base64-encoded ciphertext in format: IV:Ciphertext
 * @param key - Base64-encoded 256-bit key
 * @returns Decrypted plaintext string
 */
export async function decrypt(ciphertext: string, key: string): Promise<string> {
  try {
    // Parse IV:Ciphertext
    const parts = ciphertext.split(":");
    if (parts.length !== 2) {
      throw new Error("Invalid ciphertext format");
    }

    const [ivBase64, encryptedBase64] = parts;

    // Convert from base64
    const iv = base64ToArrayBuffer(ivBase64);
    const encrypted = base64ToArrayBuffer(encryptedBase64);
    const keyBytes = base64ToArrayBuffer(key);

    // Import key
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: ALGORITHM },
      false,
      ["decrypt"]
    );

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: iv,
      },
      cryptoKey,
      encrypted
    );

    // Convert bytes to string
    return arrayBufferToString(decrypted);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data. Key may be invalid.");
  }
}

// =====================================================
// KEY WRAPPING (for passphrase-based backup)
// =====================================================

/**
 * Derive an encryption key from a user passphrase using PBKDF2
 * (We'll use PBKDF2 as it's available in Web Crypto; Argon2 requires native module)
 * @param passphrase - User's chosen passphrase
 * @param salt - Random salt (16 bytes, base64)
 * @returns Derived key (base64)
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: string
): Promise<string> {
  try {
    const saltBytes = base64ToArrayBuffer(salt);
    const passphraseBytes = stringToArrayBuffer(passphrase);

    // Import passphrase as key material
    const baseKey = await crypto.subtle.importKey(
      "raw",
      passphraseBytes,
      "PBKDF2",
      false,
      ["deriveBits"]
    );

    // Derive 256-bit key using PBKDF2
    // Using 100,000 iterations (OWASP minimum for 2023)
    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations: 100000,
        hash: "SHA-256",
      },
      baseKey,
      256
    );

    return arrayBufferToBase64(derivedBits);
  } catch (error) {
    console.error("Key derivation error:", error);
    throw new Error("Failed to derive key from passphrase");
  }
}

/**
 * Generate a random salt for PBKDF2
 * @returns Base64-encoded salt (16 bytes)
 */
export async function generateSalt(): Promise<string> {
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  return arrayBufferToBase64(saltBytes);
}

/**
 * Wrap (encrypt) the user's encryption key with a passphrase-derived key
 * @param userKey - The user's actual encryption key (base64)
 * @param passphrase - User's chosen passphrase
 * @returns Object with salt and wrapped key (both base64), formatted as "salt:wrappedKey"
 */
export async function wrapKeyWithPassphrase(
  userKey: string,
  passphrase: string
): Promise<string> {
  try {
    // Generate random salt
    const salt = await generateSalt();

    // Derive KEK from passphrase
    const kek = await deriveKeyFromPassphrase(passphrase, salt);

    // Encrypt user key with KEK
    const wrappedKey = await encrypt(userKey, kek);

    // Return salt:wrappedKey
    return `${salt}:${wrappedKey}`;
  } catch (error) {
    console.error("Key wrapping error:", error);
    throw new Error("Failed to wrap key with passphrase");
  }
}

/**
 * Unwrap (decrypt) the user's encryption key using passphrase
 * @param wrappedKeyBlob - Format: "salt:wrappedKey"
 * @param passphrase - User's passphrase
 * @returns The unwrapped user key (base64)
 */
export async function unwrapKeyWithPassphrase(
  wrappedKeyBlob: string,
  passphrase: string
): Promise<string> {
  try {
    // Parse salt:wrappedKey
    const parts = wrappedKeyBlob.split(":");
    if (parts.length < 3) {
      // salt:iv:ciphertext minimum
      throw new Error("Invalid wrapped key format");
    }

    const salt = parts[0];
    const wrappedKey = parts.slice(1).join(":"); // Rejoin in case ciphertext has colons

    // Derive KEK from passphrase
    const kek = await deriveKeyFromPassphrase(passphrase, salt);

    // Decrypt user key
    const userKey = await decrypt(wrappedKey, kek);

    return userKey;
  } catch (error) {
    console.error("Key unwrapping error:", error);
    throw new Error("Failed to unwrap key. Passphrase may be incorrect.");
  }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}
