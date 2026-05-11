import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import logger from "@/lib/logger";

const BIOMETRIC_ACCOUNTS_LIST_KEY = "biometric_accounts_list";
const USED_ACCOUNTS_LIST_KEY = "used_accounts_list";

export interface BiometricCredentials {
  email: string;
  password: string;
}

export interface BiometricAccount {
  email: string;
  lastUsed: string;
}

export interface UsedAccount {
  email: string;
  lastUsed: string;
}

/**
 * Creates a SecureStore-safe key from an email.
 * SecureStore keys must match [a-zA-Z0-9._-] on Android.
 */
function getStorageKey(prefix: string, email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `${prefix}_${Math.abs(hash).toString(36)}`;
}

/**
 * Checks whether biometric authentication is available on the device.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

/**
 * Gets the available biometric authentication types.
 */
export async function getBiometricTypes(): Promise<
  LocalAuthentication.AuthenticationType[]
> {
  return await LocalAuthentication.supportedAuthenticationTypesAsync();
}

/**
 * Gets all biometric accounts.
 */
export async function getAllBiometricAccounts(): Promise<BiometricAccount[]> {
  try {
    const accountsJson = await SecureStore.getItemAsync(BIOMETRIC_ACCOUNTS_LIST_KEY);
    if (!accountsJson) return [];
    return JSON.parse(accountsJson);
  } catch (error) {
    logger.log("Error loading biometric accounts:", error);
    return [];
  }
}

/**
 * Updates the biometric accounts list.
 */
async function updateBiometricAccountsList(accounts: BiometricAccount[]): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ACCOUNTS_LIST_KEY, JSON.stringify(accounts));
}

/**
 * Saves biometric credentials for a specific email.
 * The password is stored in SecureStore (iOS Keychain / Android Keystore),
 * which provides hardware-backed encrypted storage.
 */
export async function saveBiometricCredentials(
  email: string,
  password: string,
): Promise<void> {
  const emailKey = getStorageKey("be", email);
  const passwordKey = getStorageKey("bp", email);

  await SecureStore.setItemAsync(emailKey, email);
  await SecureStore.setItemAsync(passwordKey, password);

  const accounts = await getAllBiometricAccounts();
  const existingIndex = accounts.findIndex(acc => acc.email === email);

  if (existingIndex >= 0) {
    accounts[existingIndex].lastUsed = new Date().toISOString();
  } else {
    accounts.push({
      email,
      lastUsed: new Date().toISOString(),
    });
  }

  await updateBiometricAccountsList(accounts);
}

/**
 * Loads saved credentials for a specific email.
 */
export async function getBiometricCredentials(email: string): Promise<BiometricCredentials | null> {
  try {
    const emailKey = getStorageKey("be", email);
    const passwordKey = getStorageKey("bp", email);

    const storedEmail = await SecureStore.getItemAsync(emailKey);
    const password = await SecureStore.getItemAsync(passwordKey);

    if (!storedEmail || !password || storedEmail !== email) return null;

    return { email: storedEmail, password };
  } catch (error) {
    return null;
  }
}

/**
 * Deletes saved credentials for a specific email.
 */
export async function deleteBiometricCredentials(email: string): Promise<void> {
  try {
    const emailKey = getStorageKey("be", email);
    const passwordKey = getStorageKey("bp", email);

    await SecureStore.deleteItemAsync(emailKey);
    await SecureStore.deleteItemAsync(passwordKey);

    // Also remove the old refresh-token key if it exists.
    const rtKey = getStorageKey("bio_rt", email);
    await SecureStore.deleteItemAsync(rtKey).catch(() => {});

    const accounts = await getAllBiometricAccounts();
    const filteredAccounts = accounts.filter(acc => acc.email !== email);
    await updateBiometricAccountsList(filteredAccounts);
  } catch (error) {
    // Non-critical
  }
}

/**
 * Checks whether credentials are saved for a specific email.
 */
export async function hasBiometricCredentials(email: string): Promise<boolean> {
  const credentials = await getBiometricCredentials(email);
  return credentials !== null;
}

/**
 * Gets the most recently used biometric account.
 */
export async function getDefaultBiometricAccount(): Promise<BiometricAccount | null> {
  const accounts = await getAllBiometricAccounts();
  if (accounts.length === 0) return null;

  accounts.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());
  return accounts[0];
}

/**
 * Gets all used accounts, independent of biometrics.
 */
export async function getAllUsedAccounts(): Promise<UsedAccount[]> {
  try {
    const accountsJson = await SecureStore.getItemAsync(USED_ACCOUNTS_LIST_KEY);
    if (!accountsJson) return [];
    return JSON.parse(accountsJson);
  } catch (error) {
    logger.log("Error loading used accounts:", error);
    return [];
  }
}

/**
 * Updates the used accounts list.
 */
async function updateUsedAccountsList(accounts: UsedAccount[]): Promise<void> {
  await SecureStore.setItemAsync(USED_ACCOUNTS_LIST_KEY, JSON.stringify(accounts));
}

/**
 * Saves or updates an account in the used accounts list.
 */
export async function saveUsedAccount(email: string): Promise<void> {
  try {
    const accounts = await getAllUsedAccounts();
    const existingIndex = accounts.findIndex(acc => acc.email === email);

    if (existingIndex >= 0) {
      accounts[existingIndex].lastUsed = new Date().toISOString();
    } else {
      accounts.push({
        email,
        lastUsed: new Date().toISOString(),
      });
    }

    await updateUsedAccountsList(accounts);
  } catch (error) {
    logger.log("Error saving used account:", error);
  }
}

/**
 * Gets the most recently used account, independent of biometrics.
 */
export async function getDefaultUsedAccount(): Promise<UsedAccount | null> {
  const accounts = await getAllUsedAccounts();
  if (accounts.length === 0) return null;

  accounts.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());
  return accounts[0];
}

/**
 * Removes an account from the used accounts list.
 */
export async function removeUsedAccount(email: string): Promise<void> {
  try {
    const accounts = await getAllUsedAccounts();
    const filteredAccounts = accounts.filter(acc => acc.email !== email);
    await updateUsedAccountsList(filteredAccounts);
  } catch (error) {
    logger.log("Error removing used account:", error);
  }
}

/**
 * Updates the last-used timestamp for a specific email.
 */
export async function updateLastUsed(email: string): Promise<void> {
  const accounts = await getAllBiometricAccounts();
  const account = accounts.find(acc => acc.email === email);

  if (account) {
    account.lastUsed = new Date().toISOString();
    await updateBiometricAccountsList(accounts);
  }
}

/**
 * Runs biometric authentication and returns credentials for a specific email on success.
 */
export async function authenticateWithBiometrics(email: string): Promise<BiometricCredentials | null> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Přihlaste se pomocí biometrie",
    cancelLabel: "Zrušit",
    disableDeviceFallback: false,
  });

  if (!result.success) return null;

  const credentials = await getBiometricCredentials(email);
  if (credentials) {
    await updateLastUsed(email);
  }

  return credentials;
}

/**
 * Migrates from the legacy single-account system to the multi-account system.
 * Remove after several releases.
 */
export async function migrateLegacyBiometricCredentials(): Promise<void> {
  try {
    // Remove keys from the old storage format.
    await SecureStore.deleteItemAsync("biometric_email").catch(() => {});
    await SecureStore.deleteItemAsync("biometric_password").catch(() => {});
  } catch (error) {
    // Non-critical
  }
}
