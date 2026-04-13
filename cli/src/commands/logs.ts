import chalk from 'chalk';
import { apiClient } from '../lib/api';

interface LogEntry {
  id: string;
  method: string;
  endpoint: string;
  responseStatus: number;
  responseTimeMs: number;
  errorCode?: string;
  errorMessage?: string;
  rateLimitHit: boolean;
  createdAt: string;
}

export async function logsCommand(limit: string = '20') {
  try {
    const response = await apiClient.get(`/logs?limit=${limit}`);
    const { logs } = response.data;

    if (logs.length === 0) {
      console.log(chalk.gray('\nNo logs found\n'));
      return;
    }

    console.log(chalk.blue(`\n📋 API Request Logs (last ${limit})\n`));

    // Table header
    console.log(`${chalk.gray('Time'.padEnd(20))} ${'Method'.padEnd(8)} ${'Endpoint'.padEnd(30)} ${'Status'.padEnd(8)} ${'Time'.padEnd(8)}`);
    console.log(chalk.gray('─'.repeat(90)));

    for (const log of logs) {
      const time = new Date(log.createdAt).toLocaleString();
      const method = log.method;
      const endpoint = log.endpoint.length > 28 ? log.endpoint.slice(0, 25) + '...' : log.endpoint;
      const status = log.responseStatus.toString();
      const responseTime = `${log.responseTimeMs}ms`;

      const statusColor = log.responseStatus < 400
        ? chalk.green
        : log.responseStatus === 429
          ? chalk.yellow
          : chalk.red;

      console.log(
        `${chalk.gray(time.padEnd(20))} ` +
        `${method.padEnd(8)} ` +
        `${endpoint.padEnd(30)} ` +
        `${statusColor(status.padEnd(8))} ` +
        `${chalk.gray(responseTime.padEnd(8))}`
      );

      if (log.errorCode) {
        console.log(chalk.red(`  → Error: ${log.errorCode}${log.errorMessage ? ': ' + log.errorMessage : ''}`));
      }
      if (log.rateLimitHit) {
        console.log(chalk.yellow(`  → Rate limited`));
      }
    }

    console.log('');
  } catch (error) {
    console.error(chalk.red('\nFailed to fetch logs'));
    console.error(chalk.red((error as Error).message));
  }
}
