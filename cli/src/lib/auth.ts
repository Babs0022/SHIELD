import keytar from 'keytar';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

const SERVICE_NAME = 'shield-cli';
const ACCOUNT_NAME = 'api-key';

export async function getApiKey(): Promise<string | null> {
  try {
    // Try keychain first
    const key = await keytar.getPassword(SERVICE_NAME, ACCOUNT_NAME);
    if (key) return key;

    // Fallback to config file (less secure, for CI/CD)
    const configPath = path.join(os.homedir(), '.shield', 'config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    return config.apiKey || null;
  } catch {
    return null;
  }
}

export async function setApiKey(apiKey: string): Promise<void> {
  // Save to keychain
  await keytar.setPassword(SERVICE_NAME, ACCOUNT_NAME, apiKey);

  // Also save to config file for reference (not the key itself)
  const configDir = path.join(os.homedir(), '.shield');
  await fs.mkdir(configDir, { recursive: true });

  const configPath = path.join(configDir, 'config.json');
  const config = {
    apiKeyPrefix: apiKey.substring(0, 20),
    lastLogin: new Date().toISOString(),
  };

  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export async function clearAuth(): Promise<void> {
  await keytar.deletePassword(SERVICE_NAME, ACCOUNT_NAME);
}