import sql from './db';

/**
 * Initialize all required database tables
 * Run this on app startup to ensure schema is up to date
 */
export async function initializeDatabase() {
  try {
    // Create rate_limits table
    await sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(42) NOT NULL,
        requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create index on rate_limits for efficient cleanup
    await sql`
      CREATE INDEX IF NOT EXISTS idx_rate_limits_wallet_time
      ON rate_limits (wallet_address, requested_at);
    `;

    // Create access_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS access_logs (
        id SERIAL PRIMARY KEY,
        policy_id VARCHAR(255) NOT NULL,
        recipient_address VARCHAR(42) NOT NULL,
        success BOOLEAN DEFAULT true,
        ip_address VARCHAR(45),
        accessed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Create indexes for access_logs
    await sql`
      CREATE INDEX IF NOT EXISTS idx_access_logs_policy_id
      ON access_logs (policy_id);
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_at
      ON access_logs (accessed_at);
    `;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}

// Run initialization if this file is imported
initializeDatabase().catch(console.error);
