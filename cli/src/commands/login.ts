import open from 'open';
import chalk from 'chalk';
import ora from 'ora';
import QRCode from 'qrcode-terminal';
import { setApiKey } from '../lib/auth';
import { apiClient } from '../lib/api';

const DEVELOPER_URL = process.env.SHIELD_DEVELOPER_URL || 'http://localhost:3002';

export async function loginCommand() {
  console.log(chalk.blue('🔐 SHIELD Developer CLI Authentication\n'));

  const spinner = ora('Initiating authentication...').start();

  try {
    // Step 1: Get device code from API
    const response = await apiClient.post('/auth/cli/initiate', {
      cliVersion: '0.1.0',
    });

    const { deviceCode, verificationUri, expiresIn } = response.data;

    spinner.succeed('Authentication initiated');

    console.log(`\n${chalk.bold('Your login code:')} ${chalk.cyan(deviceCode)}\n`);
    console.log(`${chalk.gray('Verification URL:')} ${verificationUri}\n`);

    // Show QR code
    console.log(chalk.gray('Or scan this QR code:\n'));
    QRCode.generate(verificationUri, { small: true });

    // Open browser
    console.log(chalk.gray('\nOpening browser...'));
    await open(verificationUri);

    // Step 3: Poll for completion
    const result = await pollForAuth(deviceCode, expiresIn);

    if (!result) {
      // Needs API key - wait for user to generate one
      console.log(chalk.yellow('\n⚠️  No API key found'));
      console.log(chalk.gray('Please generate an API key from the dashboard to complete CLI authentication.\n'));
      console.log(chalk.cyan(`Opening ${DEVELOPER_URL}/dashboard?cliAuth=true\n`));

      await open(`${DEVELOPER_URL}/dashboard?cliAuth=true`);

      // Continue polling until API key is generated
      console.log(chalk.gray('Waiting for API key generation (press Ctrl+C to cancel)...'));
      const finalResult = await pollForApiKey(deviceCode, expiresIn);

      await setApiKey(finalResult.apiKey);

      console.log(chalk.green('\n✓ Successfully authenticated!'));
      console.log(chalk.gray(`  API Key: ${finalResult.apiKey.substring(0, 20)}...`));
      console.log(chalk.gray(`  EOA: ${finalResult.eoaAddress}\n`));
    } else {
      // Save API key
      await setApiKey(result.apiKey);

      console.log(chalk.green('\n✓ Successfully authenticated!'));
      console.log(chalk.gray(`  API Key: ${result.apiKey.substring(0, 20)}...`));
      console.log(chalk.gray(`  EOA: ${result.eoaAddress}\n`));
    }

  } catch (error) {
    spinner.fail('Authentication failed');
    const message = (error as Error).message;
    console.error(chalk.red(message || 'Unknown error'));
    throw error;
  }
}

async function pollForAuth(deviceCode: string, expiresIn: number): Promise<{ apiKey: string; eoaAddress: string } | null> {
  const startTime = Date.now();
  const timeout = expiresIn * 1000;

  while (Date.now() - startTime < timeout) {
    await sleep(3000);

    try {
      const response = await apiClient.get(`/auth/cli/status?code=${deviceCode}`);
      const data = response.data;

      if (data.status === 'completed') {
        // Check if needs API key
        if (!data.hasApiKey) {
          return null; // Signal that we need to wait for API key generation
        }

        // Has API key - check if it's masked (user needs to paste full key)
        if (data.apiKey && data.apiKey.endsWith('...')) {
          console.log(chalk.yellow('\n⚠️  Existing API key found'));
          console.log(chalk.gray('Please copy your full API key from the dashboard:\n'));
          console.log(chalk.cyan(`${DEVELOPER_URL}/dashboard\n`));

          const inquirer = await import('inquirer');
          const { apiKey } = await inquirer.default.prompt([
            {
              type: 'password',
              name: 'apiKey',
              message: 'Paste your full API key:',
              mask: '*',
              validate: (input: string) => input.length > 20 || 'Please paste the full API key',
            },
          ]);

          return {
            apiKey,
            eoaAddress: data.eoaAddress,
          };
        }

        // Full API key returned (newly created)
        return {
          apiKey: data.apiKey,
          eoaAddress: data.eoaAddress,
        };
      }

      if (data.status === 'expired') {
        throw new Error('Authentication expired');
      }

      process.stdout.write('.');
    } catch (error) {
      if ((error as Error).message === 'Authentication expired') throw error;
      // Continue polling on network errors
    }
  }

  throw new Error('Authentication timed out');
}

async function pollForApiKey(deviceCode: string, expiresIn: number): Promise<{ apiKey: string; eoaAddress: string }> {
  const startTime = Date.now();
  const timeout = expiresIn * 1000;

  while (Date.now() - startTime < timeout) {
    await sleep(3000);

    try {
      const response = await apiClient.get(`/auth/cli/status?code=${deviceCode}`);
      const data = response.data;

      if (data.status === 'completed' && data.hasApiKey) {
        // API key was generated - ask user to paste it
        console.log(chalk.green('\n\n✓ API key detected!'));
        console.log(chalk.gray('Please paste your API key from the dashboard:\n'));

        const inquirer = await import('inquirer');
        const { apiKey } = await inquirer.default.prompt([
          {
            type: 'password',
            name: 'apiKey',
            message: 'API Key:',
            mask: '*',
            validate: (input: string) => input.length > 20 || 'Please paste the full API key',
          },
        ]);

        return {
          apiKey,
          eoaAddress: data.eoaAddress,
        };
      }

      if (data.status === 'expired') {
        throw new Error('Authentication expired');
      }

      process.stdout.write('.');
    } catch (error) {
      if ((error as Error).message === 'Authentication expired') throw error;
      // Continue polling on network errors
    }
  }

  throw new Error('Authentication timed out');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
