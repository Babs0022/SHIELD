import chalk from 'chalk';
import { getApiKey } from '../lib/auth';
import { apiClient } from '../lib/api';

export async function whoamiCommand() {
  const apiKey = await getApiKey();

  if (!apiKey) {
    console.log(chalk.yellow('Not authenticated. Run: shield login'));
    return;
  }

  try {
    const response = await apiClient.get('/account');
    const data = response.data;

    console.log(chalk.blue('SHIELD Developer Account\n'));
    console.log(`${chalk.bold('Owner Address:')} ${data.account.ownerAddress}`);
    console.log(`${chalk.bold('API Wallet:')}    ${data.account.eoaAddress}`);
    console.log(`${chalk.bold('Tier:')}          ${chalk.cyan(data.account.tier)}`);
    console.log(`${chalk.bold('API Key:')}       ${apiKey.substring(0, 20)}...`);
    console.log(`${chalk.bold('Balance:')}       ${data.balance.onChainEth} ETH`);
  } catch (error) {
    console.error(chalk.red('Failed to fetch account info'));
    throw error;
  }
}