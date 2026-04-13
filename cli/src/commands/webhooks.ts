import chalk from 'chalk';
import { apiClient } from '../lib/api';
import readline from 'readline';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
}

export async function webhooksCommand() {
  try {
    const response = await apiClient.get('/webhooks');
    const { webhooks } = response.data;

    if (webhooks.length === 0) {
      console.log(chalk.gray('\nNo webhooks configured\n'));
      console.log(chalk.yellow('Use "webhooks add" to create one\n'));
      return;
    }

    console.log(chalk.blue('\n🔗 Webhooks\n'));

    for (const wh of webhooks) {
      const status = wh.isActive ? chalk.green('● Active') : chalk.gray('○ Inactive');
      console.log(`${status} ${chalk.bold(wh.url)}`);
      console.log(chalk.gray(`   Events: ${wh.events.join(', ')}`));
      console.log(chalk.gray(`   Created: ${new Date(wh.createdAt).toLocaleDateString()}`));
      console.log('');
    }

    console.log(chalk.gray('Commands: webhooks add, webhooks remove <id>\n'));
  } catch (error) {
    console.error(chalk.red('\nFailed to fetch webhooks'));
    console.error(chalk.red((error as Error).message));
  }
}

export async function addWebhook(): Promise<void> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(chalk.gray('Webhook URL: '), async (url) => {
      if (!url.startsWith('https://')) {
        console.log(chalk.red('\nURL must start with https://\n'));
        rl.close();
        resolve();
        return;
      }

      rl.question(chalk.gray('Events (comma-separated, e.g., policy.created,access.success): '), async (eventsInput) => {
        const events = eventsInput.split(',').map((e: string) => e.trim()).filter(Boolean);

        if (events.length === 0) {
          console.log(chalk.red('\nAt least one event required\n'));
          rl.close();
          resolve();
          return;
        }

        try {
          await apiClient.post('/webhooks', {
            url,
            events,
            secret: null, // Generate server-side
          });
          console.log(chalk.green('\n✓ Webhook created\n'));
        } catch (error) {
          console.error(chalk.red('\nFailed to create webhook'));
          console.error(chalk.red((error as Error).message));
        }

        rl.close();
        resolve();
      });
    });
  });
}

export async function removeWebhook(webhookId: string): Promise<void> {
  try {
    await apiClient.delete(`/webhooks?id=${webhookId}`);
    console.log(chalk.green('\n✓ Webhook removed\n'));
  } catch (error) {
    console.error(chalk.red('\nFailed to remove webhook'));
    console.error(chalk.red((error as Error).message));
  }
}
