import chalk from 'chalk';
import { getApiKey, clearAuth } from '../lib/auth';
import { apiClient } from '../lib/api';
import open from 'open';

const SHIELD_ASCII = `
  ███████╗██╗  ██╗██╗███████╗██╗     ██████╗
  ██╔════╝██║  ██║██║██╔════╝██║     ██╔══██╗
  ███████╗███████║██║█████╗  ██║     ██║  ██║
  ╚════██║██╔══██║██║██╔══╝  ██║     ██║  ██║
  ███████║██║  ██║██║███████╗███████╗██████╔╝
  ╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚═════╝
`;

const COMMANDS: Record<string, { desc: string; handler: () => Promise<void> }> = {
  balance: {
    desc: 'Check API wallet balance',
    handler: async () => {
      try {
        const response = await apiClient.get('/session/account');
        const data = response.data;
        console.log(chalk.blue('\n💰 Balance\n'));
        console.log(`${chalk.bold('On-Chain:')}  ${data.balance.onChainEth} ETH`);
        console.log(`${chalk.bold('EOA:')}       ${data.balance.eoaAddress}\n`);
      } catch (err) {
        console.error(chalk.red('Failed to fetch balance'));
      }
    },
  },
  whoami: {
    desc: 'Show account info',
    handler: async () => {
      try {
        const response = await apiClient.get('/session/account');
        const data = response.data;
        console.log(chalk.blue('\n👤 Account\n'));
        console.log(`${chalk.bold('Owner:')}   ${data.account.ownerAddress}`);
        console.log(`${chalk.bold('EOA:')}     ${data.account.eoaAddress}`);
        console.log(`${chalk.bold('Tier:')}    ${data.account.tier}\n`);
      } catch (err) {
        console.error(chalk.red('Failed to fetch account'));
      }
    },
  },
  dashboard: {
    desc: 'Open web dashboard',
    handler: async () => {
      const DEVELOPER_URL = process.env.SHIELD_DEVELOPER_URL || 'http://localhost:3002';
      await open(`${DEVELOPER_URL}/dashboard`);
      console.log(chalk.gray('\nOpening dashboard...\n'));
    },
  },
  logout: {
    desc: 'Sign out',
    handler: async () => {
      await clearAuth();
      console.log(chalk.green('\n✓ Logged out\n'));
      process.exit(0);
    },
  },
  help: {
    desc: 'Show commands',
    handler: async () => {
      console.log(chalk.blue('\n📚 Commands\n'));
      Object.entries(COMMANDS).forEach(([cmd, { desc }]) => {
        console.log(`  ${chalk.cyan(cmd.padEnd(12))} ${desc}`);
      });
      console.log(`  ${chalk.cyan('exit'.padEnd(12))} Exit CLI\n`);
    },
  },
};

export async function interactiveCommand() {
  // Check auth
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.log(chalk.yellow('\n⚠️  Not authenticated'));
    console.log(chalk.gray('Run: shield login\n'));
    process.exit(1);
  }

  // Show banner
  console.clear();
  console.log(chalk.cyan(SHIELD_ASCII));
  console.log(chalk.gray('Developer CLI v0.1.0'));
  console.log(chalk.gray('Type "help" for commands, "exit" to quit\n'));

  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan('shield › '),
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim().toLowerCase();

    if (input === 'exit' || input === 'quit') {
      console.log(chalk.gray('\nGoodbye! 👋\n'));
      rl.close();
      return;
    }

    if (input === '') {
      rl.prompt();
      return;
    }

    const command = COMMANDS[input];
    if (command) {
      try {
        await command.handler();
      } catch (err) {
        console.error(chalk.red(`Error: ${(err as Error).message}`));
      }
    } else {
      console.log(chalk.red(`Unknown: ${input}`));
      console.log(chalk.gray('Type "help" for commands'));
    }

    rl.prompt();
  });

  rl.on('close', () => {
    console.log(chalk.gray('\nGoodbye! 👋\n'));
    process.exit(0);
  });
}
