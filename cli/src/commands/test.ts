import chalk from 'chalk';
import { apiClient } from '../lib/api.js';

export async function testCommand() {
  console.log(chalk.blue('\n🔌 Testing Database Connection...\n'));
  console.log(chalk.gray('Waking up Neon database (this may take 10-30s on cold start)...\n'));

  try {
    const start = Date.now();
    const response = await apiClient.get('/api/health');
    const latency = Date.now() - start;

    const data = response.data;

    if (data.status === 'healthy') {
      console.log(chalk.green('✅ Connected to Neon'));
      console.log(chalk.gray(`  Database: ${data.database}`));
      console.log(chalk.gray(`  Latency: ${data.latencyMs}ms`));
      console.log(chalk.gray(`  Total Time: ${latency}ms`));
      console.log('');
      console.log(chalk.gray('Database is warm and ready for API calls.'));
      console.log('');
    } else {
      console.log(chalk.red('❌ Connection failed'));
      console.log(chalk.red(`  Status: ${data.status}`));
      console.log(chalk.red(`  Error: ${data.error || 'Unknown error'}`));
      console.log('');
    }
  } catch (error) {
    console.log(chalk.red('❌ Connection failed'));
    console.log(chalk.red(`  Error: ${(error as Error).message}`));
    console.log('');
    console.log(chalk.gray('Tip: Neon free tier pauses after 5 minutes of inactivity.'));
    console.log(chalk.gray('     The database needs time to wake up. Try again in 30 seconds.'));
    console.log('');
  }
}
