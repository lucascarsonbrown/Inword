/**
 * Secure Key Storage
 *
 * Manages the user's encryption key in device secure storage.
 * Uses Expo SecureStore (iOS Keychain / Android Keystore).
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { generateEncryptionKey } from "./encryption";

// =====================================================
// CONSTANTS
// =====================================================
const ENCRYPTION_KEY_NAME = "user_kb_encryption_key";
const KEY_BACKUP_FLAG = "user_kb_key_backup_enabled";

// =====================================================
// PLATFORM CHECK
// =====================================================
// SecureStore only works on iOS and Android, not web
const isSecureStoreAvailable = Platform.OS === "ios" || Platform.OS === "android";

// =====================================================
// KEY MANAGEMENT
// =====================================================

/**
 * Get the user's encryption key from secure storage.
 * If no key exists, generate a new one and store it.
 * @returns Base64-encoded 256-bit key
 */
export async function getUserEncryptionKey(): Promise<string> {
  try {
    let key: string | null = null;

    if (isSecureStoreAvailable) {
      // Use SecureStore on iOS/Android
      key = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);
    } else {
      // Fallback to localStorage on web (less secure, for testing only)
      console.warn("⚠️ Using localStorage for encryption key (web). Not secure for production!");
      if (typeof window !== "undefined") {
        key = localStorage.getItem(ENCRYPTION_KEY_NAME);
      }
    }

    if (!key) {
      // Generate new key
      console.log("🔑 No encryption key found. Generating new key...");
      key = await generateEncryptionKey();

      // Store it
      if (isSecureStoreAvailable) {
        await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, key);
        console.log("✅ New encryption key generated and stored in SecureStore");
      } else {
        if (typeof window !== "undefined") {
          localStorage.setItem(ENCRYPTION_KEY_NAME, key);
          console.log("✅ New encryption key generated and stored in localStorage (web)");
        }
      }
    }

    return key;
  } catch (error) {
    console.error("Error accessing encryption key:", error);
    throw new Error("Failed to access encryption key");
  }
}

/**
 * Check if the user has an encryption key
 * @returns true if key exists
 */
export async function hasEncryptionKey(): Promise<boolean> {
  try {
    if (isSecureStoreAvailable) {
      const key = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);
      return key !== null;
    } else {
      if (typeof window !== "undefined") {
        return localStorage.getItem(ENCRYPTION_KEY_NAME) !== null;
      }
      return false;
    }
  } catch (error) {
    console.error("Error checking for encryption key:", error);
    return false;
  }
}

/**
 * Delete the user's encryption key (WARNING: Irreversible!)
 * This will make all encrypted data unrecoverable.
 */
export async function deleteEncryptionKey(): Promise<void> {
  try {
    if (isSecureStoreAvailable) {
      await SecureStore.deleteItemAsync(ENCRYPTION_KEY_NAME);
      await SecureStore.deleteItemAsync(KEY_BACKUP_FLAG);
    } else {
      if (typeof window !== "undefined") {
        localStorage.removeItem(ENCRYPTION_KEY_NAME);
        localStorage.removeItem(KEY_BACKUP_FLAG);
      }
    }
    console.log("🗑️ Encryption key deleted");
  } catch (error) {
    console.error("Error deleting encryption key:", error);
    throw new Error("Failed to delete encryption key");
  }
}

/**
 * Manually set the encryption key (for restore from backup)
 * @param key - Base64-encoded 256-bit key
 */
export async function setEncryptionKey(key: string): Promise<void> {
  try {
    if (isSecureStoreAvailable) {
      await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, key);
    } else {
      if (typeof window !== "undefined") {
        localStorage.setItem(ENCRYPTION_KEY_NAME, key);
      }
    }
    console.log("✅ Encryption key restored");
  } catch (error) {
    console.error("Error setting encryption key:", error);
    throw new Error("Failed to set encryption key");
  }
}

// =====================================================
// KEY BACKUP FLAGS
// =====================================================

/**
 * Check if the user has enabled key backup
 */
export async function isKeyBackupEnabled(): Promise<boolean> {
  try {
    if (isSecureStoreAvailable) {
      const flag = await SecureStore.getItemAsync(KEY_BACKUP_FLAG);
      return flag === "true";
    } else {
      if (typeof window !== "undefined") {
        return localStorage.getItem(KEY_BACKUP_FLAG) === "true";
      }
      return false;
    }
  } catch (error) {
    console.error("Error checking key backup flag:", error);
    return false;
  }
}

/**
 * Set the key backup flag
 * @param enabled - Whether backup is enabled
 */
export async function setKeyBackupEnabled(enabled: boolean): Promise<void> {
  try {
    if (isSecureStoreAvailable) {
      await SecureStore.setItemAsync(KEY_BACKUP_FLAG, enabled ? "true" : "false");
    } else {
      if (typeof window !== "undefined") {
        localStorage.setItem(KEY_BACKUP_FLAG, enabled ? "true" : "false");
      }
    }
  } catch (error) {
    console.error("Error setting key backup flag:", error);
    throw new Error("Failed to set key backup flag");
  }
}

// =====================================================
// SECURITY NOTES
// =====================================================

/**
 * IMPORTANT SECURITY CONSIDERATIONS:
 *
 * 1. The encryption key NEVER leaves the device unless the user
 *    explicitly enables backup with a passphrase.
 *
 * 2. If the user loses their device without backup enabled,
 *    ALL encrypted data is permanently lost.
 *
 * 3. Expo SecureStore uses:
 *    - iOS: Keychain with kSecAttrAccessibleAfterFirstUnlock
 *    - Android: EncryptedSharedPreferences with AES-256-GCM
 *
 * 4. Keys are protected by the device's secure enclave/keystore.
 *
 * 5. Biometric authentication can be required for access (TODO: optional enhancement).
 */
