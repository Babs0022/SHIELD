import sql from './db';

/**
 * Executes a SQL query with retry logic for Neon cold starts
 * Retries up to 10 times with exponential backoff
 */
export async function queryWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries = 10
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a timeout or connection error
      const errorMessage = (error as Error).message || '';
      const isTimeout =
        errorMessage.includes('timeout') ||
        errorMessage.includes('aborted') ||
        errorMessage.includes('fetch failed') ||
        errorMessage.includes('ConnectTimeoutError') ||
        errorMessage.includes('connection') ||
        errorMessage.includes('terminated') ||
        errorMessage.includes('ECONNREFUSED') ||
        (error as Error).name === 'TimeoutError' ||
        (error as Error).name === 'ConnectTimeoutError';

      if (!isTimeout || attempt === maxRetries) {
        throw error;
      }

      // Wait before retry (exponential backoff: 2s, 4s, 8s, 16s, 30s max)
      const delay = Math.min(2000 * Math.pow(2, attempt - 1), 30000);
      console.log(`Database timeout (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export default sql;
