import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

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
 * Vytvoří bezpečný klíč pro uložení emailu
 */
function getEmailStorageKey(email: string): string {
  // Jednoduchý hash na základě email adresy
  let hash = 0;
  const saltedEmail = `email_${email}_salt_2024`;
  for (let i = 0; i < saltedEmail.length; i++) {
    const char = saltedEmail.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `be_${Math.abs(hash).toString(36)}`;
}

/**
 * Vytvoří bezpečný klíč pro uložení hesla
 */
function getPasswordStorageKey(email: string): string {
  // Jednoduchý hash na základě email adresy
  let hash = 0;
  const saltedEmail = `password_${email}_salt_2024`;
  for (let i = 0; i < saltedEmail.length; i++) {
    const char = saltedEmail.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `bp_${Math.abs(hash).toString(36)}`;
}

/**
 * Zkontroluje, zda je biometrická autentizace dostupná na zařízení
 */
export async function isBiometricAvailable(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  if (!compatible) return false;

  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

/**
 * Získá typy dostupné biometrické autentizace
 */
export async function getBiometricTypes(): Promise<
  LocalAuthentication.AuthenticationType[]
> {
  return await LocalAuthentication.supportedAuthenticationTypesAsync();
}

/**
 * Získá seznam všech biometrických účtů
 */
export async function getAllBiometricAccounts(): Promise<BiometricAccount[]> {
  try {
    const accountsJson = await SecureStore.getItemAsync(BIOMETRIC_ACCOUNTS_LIST_KEY);
    if (!accountsJson) return [];
    return JSON.parse(accountsJson);
  } catch (error) {
    console.log("Error loading biometric accounts:", error);
    return [];
  }
}

/**
 * Aktualizuje seznam biometrických účtů
 */
async function updateBiometricAccountsList(accounts: BiometricAccount[]): Promise<void> {
  await SecureStore.setItemAsync(BIOMETRIC_ACCOUNTS_LIST_KEY, JSON.stringify(accounts));
}

/**
 * Uloží credentials pro biometrickou autentizaci pro konkrétní email
 */
export async function saveBiometricCredentials(
  email: string,
  password: string,
): Promise<void> {
  const emailKey = getEmailStorageKey(email);
  const passwordKey = getPasswordStorageKey(email);

  await SecureStore.setItemAsync(emailKey, email);
  await SecureStore.setItemAsync(passwordKey, password);

  // Aktualizovat seznam účtů
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
 * Načte uložené credentials pro konkrétní email
 */
export async function getBiometricCredentials(email: string): Promise<BiometricCredentials | null> {
  try {
    const emailKey = getEmailStorageKey(email);
    const passwordKey = getPasswordStorageKey(email);

    const storedEmail = await SecureStore.getItemAsync(emailKey);
    const password = await SecureStore.getItemAsync(passwordKey);

    if (!storedEmail || !password || storedEmail !== email) return null;

    return { email: storedEmail, password };
  } catch (error) {
    console.log("Error loading biometric credentials:", error);
    return null;
  }
}

/**
 * Smaže uložené credentials pro konkrétní email
 */
export async function deleteBiometricCredentials(email: string): Promise<void> {
  try {
    const emailKey = getEmailStorageKey(email);
    const passwordKey = getPasswordStorageKey(email);

    await SecureStore.deleteItemAsync(emailKey);
    await SecureStore.deleteItemAsync(passwordKey);

    // Odebrat z hlavního seznamu
    const accounts = await getAllBiometricAccounts();
    const filteredAccounts = accounts.filter(acc => acc.email !== email);
    await updateBiometricAccountsList(filteredAccounts);
  } catch (error) {
    console.log("Error deleting biometric credentials:", error);
  }
}

/**
 * Zkontroluje, zda jsou credentials uložené pro konkrétní email
 */
export async function hasBiometricCredentials(email: string): Promise<boolean> {
  const credentials = await getBiometricCredentials(email);
  return credentials !== null;
}

/**
 * Získá nejnovější použitý biometrický účet (výchozí)
 */
export async function getDefaultBiometricAccount(): Promise<BiometricAccount | null> {
  const accounts = await getAllBiometricAccounts();
  if (accounts.length === 0) return null;

  // Seřadit podle posledního použití (nejnovější první)
  accounts.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());
  return accounts[0];
}

// ===== SPRÁVA VŠECH POUŽITÝCH ÚČTŮ =====

/**
 * Získá seznam všech použitých účtů (nezávisle na biometrii)
 */
export async function getAllUsedAccounts(): Promise<UsedAccount[]> {
  try {
    const accountsJson = await SecureStore.getItemAsync(USED_ACCOUNTS_LIST_KEY);
    if (!accountsJson) return [];
    return JSON.parse(accountsJson);
  } catch (error) {
    console.log("Error loading used accounts:", error);
    return [];
  }
}

/**
 * Aktualizuje seznam použitých účtů
 */
async function updateUsedAccountsList(accounts: UsedAccount[]): Promise<void> {
  await SecureStore.setItemAsync(USED_ACCOUNTS_LIST_KEY, JSON.stringify(accounts));
}

/**
 * Uloží nebo aktualizuje účet v seznamu použitých účtů
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
    console.log("Error saving used account:", error);
  }
}

/**
 * Získá nejnovější použitý účet (nezávisle na biometrii)
 */
export async function getDefaultUsedAccount(): Promise<UsedAccount | null> {
  const accounts = await getAllUsedAccounts();
  if (accounts.length === 0) return null;

  // Seřadit podle posledního použití (nejnovější první)
  accounts.sort((a, b) => new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime());
  return accounts[0];
}

/**
 * Smaže účet ze seznamu použitých účtů
 */
export async function removeUsedAccount(email: string): Promise<void> {
  try {
    const accounts = await getAllUsedAccounts();
    const filteredAccounts = accounts.filter(acc => acc.email !== email);
    await updateUsedAccountsList(filteredAccounts);
  } catch (error) {
    console.log("Error removing used account:", error);
  }
}

/**
 * Aktualizuje čas posledního použití pro konkrétní email
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
 * Provede biometrickou autentizaci a vrátí credentials pro konkrétní email pokud je úspěšná
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
 * Migrace ze starého systému (jeden účet) na nový systém (více účtů)
 * ODSTRANIT PO NĚKOLIKA VERZÍCH
 */
export async function migrateLegacyBiometricCredentials(): Promise<void> {
  try {
    // Zkusit načíst staré klíče
    const legacyEmail = await SecureStore.getItemAsync("biometric_email");
    const legacyPassword = await SecureStore.getItemAsync("biometric_password");

    if (legacyEmail && legacyPassword) {
      console.log("Migrating legacy biometric credentials...");

      // Uložit do nového formátu
      await saveBiometricCredentials(legacyEmail, legacyPassword);

      // Také uložit jako použitý účet
      await saveUsedAccount(legacyEmail);

      // Smazat staré klíče
      await SecureStore.deleteItemAsync("biometric_email");
      await SecureStore.deleteItemAsync("biometric_password");

      console.log("Legacy biometric credentials migrated successfully");
    }
  } catch (error) {
    console.log("Error during legacy migration:", error);
  }
}
