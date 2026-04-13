import chalk from 'chalk';
import ora from 'ora';
import { apiClient } from '../lib/api';

async function balanceCommand() {
  const spinner = ora('Fetching balance...').start();

  try {
    const response = await apiClient.get('/account');
    const data = response.data;

    spinner.stop();

    console.log(chalk.blue('API Wallet Balance\n'));

    console.log(`${chalk.bold('On-Chain Balance:')} ${data.balance.onChainEth} ETH`);
    console.log(`${chalk.bold('API Wallet:')}       ${data.balance.eoaAddress}\n`);

    console.log(chalk.gray('Usage Today:'));
    console.log(`  Policies: ${data.usage.today.policies}`);
    console.log(`  Gas: ${data.usage.today.gasSpentEth.toFixed(6)} ETH ($${data.usage.today.gasSpentUsd.toFixed(2)})\n`);

    console.log(chalk.gray('Usage This Month:'));
    console.log(`  Policies: ${data.usage.thisMonth.policies}`);
    console.log(`  Gas: ${data.usage.thisMonth.gasSpentEth.toFixed(6)} ETH ($${data.usage.thisMonth.gasSpentUsd.toFixed(2)})\n`);

    if (parseFloat(data.balance.onChainEth) < 0.001) {
      console.log(chalk.yellow('⚠️  Low balance. Add funds to continue creating policies.\n'));
      console.log(chalk.gray('Send ETH to:'));
      console.log(data.balance.eoaAddress);
    }

  } catch (error) {
    spinner.fail('Failed to fetch balance');
    throw error;
  }
}

async function withdraw(amount: string, options: { to: string }) {
  console.log(chalk.yellow('Withdrawal must be done through the web dashboard for security.\n'));
  console.log(chalk.gray('Visit: https://developer.shieldhq.xyz/billing'));
}

export default balanceCommand;
export { withdraw };