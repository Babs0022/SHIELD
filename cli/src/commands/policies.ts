import fs from 'fs/promises';
import crypto from 'crypto';
import chalk from 'chalk';
import ora from 'ora';
import { apiClient } from '../lib/api';
import axios from 'axios';
import FormData from 'form-data';

interface CreateOptions {
  recipient: string;
  expiry: string;
  attempts: string;
}

// Generate JWK format key (matches Web Crypto API)
function generateJwkKey(): { jwk: { kty: string; k: string; alg: string; ext: boolean; key_ops: string[] }; keyString: string } {
  // Generate 256-bit key
  const keyBytes = crypto.randomBytes(32);

  // Create JWK format (same as Web Crypto API exports)
  const jwk = {
    kty: 'oct',
    k: keyBytes.toString('base64url'),
    alg: 'A256GCM',
    ext: true,
    key_ops: ['encrypt', 'decrypt'],
  };

  return { jwk, keyString: JSON.stringify(jwk) };
}

// Encrypt content using AES-256-GCM (matching Web Crypto API)
function encryptContent(content: Buffer, key: Buffer): { encryptedData: Buffer; iv: Buffer } {
  // Web Crypto uses 12-byte IV
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(content), cipher.final()]);

  // Get auth tag (16 bytes for GCM)
  const authTag = cipher.getAuthTag();

  // Combine: encryptedData + authTag (Web Crypto includes authTag at end)
  const encryptedData = Buffer.concat([encrypted, authTag]);

  return { encryptedData, iv };
}

// Combine IV and encrypted data (same as frontend)
function combineIvAndEncryptedData(iv: Buffer, encryptedData: Buffer): Buffer {
  const combined = Buffer.alloc(iv.length + encryptedData.length);
  iv.copy(combined);
  encryptedData.copy(combined, iv.length);
  return combined;
}

async function create(file: string, options: CreateOptions) {
  const spinner = ora('Reading file...').start();

  try {
    // Read file
    const fileBuffer = await fs.readFile(file);
    spinner.text = 'Encrypting content...';

    // Generate JWK key (same format as frontend Web Crypto)
    const { jwk, keyString } = generateJwkKey();

    // Get raw key bytes for encryption
    const keyBytes = Buffer.from(jwk.k, 'base64url');

    // Encrypt file using AES-256-GCM with 12-byte IV
    const { encryptedData, iv } = encryptContent(fileBuffer, keyBytes);

    // Combine IV + encrypted data (matching frontend format)
    const finalBuffer = combineIvAndEncryptedData(iv, encryptedData);

    spinner.text = 'Uploading to IPFS...';

    // Upload directly to Pinata (same as frontend)
    const pinataApiKey = process.env.PINATA_API_KEY;
    if (!pinataApiKey) {
      throw new Error('PINATA_API_KEY environment variable not set');
    }

    const formData = new FormData();
    formData.append('file', finalBuffer, {
      filename: 'encrypted-content',
      contentType: 'application/octet-stream',
    });

    const pinataResponse = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${pinataApiKey}`,
          'Content-Type': 'multipart/form-data',
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      }
    );

    if (pinataResponse.status !== 200) {
      throw new Error('Failed to upload to IPFS');
    }

    const contentCid = pinataResponse.data.IpfsHash;

    spinner.text = 'Creating policy...';

    // Parse expiry
    const expiryMatch = options.expiry.match(/^(\d+)([hd])$/);
    if (!expiryMatch) {
      throw new Error('Invalid expiry format. Use: 24h, 7d, etc.');
    }

    const [, amount, unit] = expiryMatch;
    const expirySeconds = unit === 'h'
      ? parseInt(amount) * 3600
      : parseInt(amount) * 86400;

    const response = await apiClient.post('/policies', {
      contentCid,
      recipientAddress: options.recipient,
      expiry: expirySeconds,
      maxAttempts: parseInt(options.attempts),
      isText: false,
      contentLength: fileBuffer.length,
      mimeType: 'application/octet-stream',
    });

    const data = response.data;

    // Construct secure link locally with JWK key in fragment (never sent to server)
    const secureLink = `${data.link}#${encodeURIComponent(keyString)}`;

    spinner.succeed('Policy created successfully!');

    console.log(chalk.green('\n✓ Secure link created'));
    console.log(chalk.gray(`  Policy ID: ${data.policyId}`));
    console.log(chalk.gray(`  Link: ${secureLink}`));
    console.log(chalk.gray(`  Transaction: ${data.txHash}`));
    const gasCostEth = typeof data.gasCostEth === 'number' ? data.gasCostEth.toFixed(6) : data.gasCostEth;
    const gasCostUsd = typeof data.gasCostUsd === 'number' ? data.gasCostUsd.toFixed(2) : '0.00';
    console.log(chalk.gray(`  Gas Used: ${gasCostEth} ETH ($${gasCostUsd})`));
    console.log('');
    console.log(chalk.yellow('  ⚠️  Keep this link safe - it contains the decryption key'));
    console.log('');

  } catch (error) {
    spinner.fail('Failed to create policy');

    if ((error as any).response?.status === 402) {
      console.error(chalk.red('Insufficient balance. Run: shield balance'));
    } else {
      console.error(chalk.red((error as Error).message));
    }

    throw error;
  }
}

interface ListOptions {
  status?: string;
  limit: string;
}

async function list(options: ListOptions) {
  const spinner = ora('Fetching policies...').start();

  try {
    const params = new URLSearchParams();
    if (options.status) params.append('status', options.status);
    params.append('limit', options.limit);

    const response = await apiClient.get(`/policies?${params.toString()}`);
    const { policies } = response.data;

    spinner.stop();

    if (policies.length === 0) {
      console.log(chalk.gray('No policies found'));
      return;
    }

    console.log(chalk.bold('\nYour Policies\n'));
    console.log(`${chalk.gray('ID'.padEnd(12))} ${'Recipient'.padEnd(20)} ${'Status'.padEnd(10)} ${'Created'}`);
    console.log(chalk.gray('─'.repeat(70)));

    for (const policy of policies) {
      const id = policy.id.slice(0, 10) + '...';
      const recipient = policy.recipient.slice(0, 6) + '...' + policy.recipient.slice(-4);
      const status = policy.status === 'active' ? chalk.green(policy.status) : chalk.gray(policy.status);
      const created = new Date(policy.createdAt).toLocaleDateString();

      console.log(`${id.padEnd(12)} ${recipient.padEnd(20)} ${status.padEnd(20)} ${created}`);
    }

    console.log('');

  } catch (error) {
    spinner.fail('Failed to fetch policies');
    console.error(chalk.red((error as Error).message));
    throw error;
  }
}

async function get(policyId: string) {
  const spinner = ora('Fetching policy...').start();

  try {
    const response = await apiClient.get('/policies');
    const { policies } = response.data;

    // Find policy by partial ID match
    const policy = policies.find((p: any) =>
      p.id.toLowerCase().startsWith(policyId.toLowerCase())
    );

    if (!policy) {
      spinner.fail('Policy not found');
      return;
    }

    spinner.stop();

    console.log(chalk.bold('\nPolicy Details\n'));
    console.log(`${chalk.gray('ID:')}           ${policy.id}`);
    console.log(`${chalk.gray('Status:')}        ${policy.status === 'active' ? chalk.green(policy.status) : chalk.gray(policy.status)}`);
    console.log(`${chalk.gray('Recipient:')}     ${policy.recipient}`);
    console.log(`${chalk.gray('Content CID:')}   ${policy.cid}`);
    console.log(`${chalk.gray('Type:')}          ${policy.isText ? 'Text' : 'File'}`);
    console.log(`${chalk.gray('MIME Type:')}     ${policy.mimeType || 'N/A'}`);
    console.log(`${chalk.gray('Size:')}          ${formatBytes(policy.contentLength)}`);
    console.log(`${chalk.gray('Created:')}       ${new Date(policy.createdAt).toLocaleString()}`);
    console.log(`${chalk.gray('Expires:')}       ${new Date(policy.expiry * 1000).toLocaleString()}`);
    console.log(`${chalk.gray('Attempts:')}      ${policy.attempts}/${policy.maxAttempts}`);
    console.log(`${chalk.gray('Accessed:')}      ${policy.accessCount} times`);
    console.log(`${chalk.gray('Link:')}          ${chalk.underline(policy.link)}`);
    console.log('');

  } catch (error) {
    spinner.fail('Failed to fetch policy');
    console.error(chalk.red((error as Error).message));
    throw error;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function revoke(policyId: string) {
  const spinner = ora('Revoking policy...').start();

  try {
    await apiClient.delete(`/policies/${policyId}`);
    spinner.succeed('Policy revoked successfully!');
    console.log(chalk.gray(`Policy ${policyId.slice(0, 10)}... has been revoked\n`));
  } catch (error) {
    spinner.fail('Failed to revoke policy');
    if ((error as any).response?.status === 404) {
      console.error(chalk.red('Policy not found'));
    } else if ((error as any).response?.status === 409) {
      console.error(chalk.red('Policy already revoked'));
    } else {
      console.error(chalk.red((error as Error).message));
    }
    throw error;
  }
}

export const policiesCommand = {
  create,
  list,
  get,
  revoke,
};
