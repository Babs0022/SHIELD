#!/usr/bin/env node

const { neon } = require('@neondatabase/serverless');

const POSTGRES_URL = process.env.POSTGRES_URL || require('fs').readFileSync('.env.local', 'utf8')
  .split('\n')
  .find(line => line.startsWith('POSTGRES_URL='))
  ?.split('=')[1]
  ?.trim();

if (!POSTGRES_URL) {
  console.error('POSTGRES_URL not found');
  process.exit(1);
}

const sql = neon(POSTGRES_URL);

async function migrate() {
  console.log('Creating developer schema and tables...\n');

  try {
    // Create schema
    await sql`CREATE SCHEMA IF NOT EXISTS developer`;
    console.log('✅ Created schema: developer');

    // Create CLI auth requests table
    await sql`
      CREATE TABLE IF NOT EXISTS developer.cli_auth_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        device_code VARCHAR(10) UNIQUE NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        owner_address VARCHAR(42),
        api_key_id UUID,
        ip_address INET,
        user_agent TEXT,
        callback_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '10 minutes',
        completed_at TIMESTAMP
      )
    `;
    console.log('✅ Created table: cli_auth_requests');

    // Create API keys table
    await sql`
      CREATE TABLE IF NOT EXISTS developer.api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_address VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),
        api_key_hash VARCHAR(64) NOT NULL UNIQUE,
        api_key_prefix VARCHAR(16) NOT NULL,
        eoa_address VARCHAR(42) NOT NULL UNIQUE,
        encrypted_eoa_key TEXT NOT NULL,
        balance_eth NUMERIC(20, 18) DEFAULT 0,
        tier VARCHAR(20) DEFAULT 'free',
        monthly_policy_limit INTEGER DEFAULT 10,
        monthly_policy_count INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        label VARCHAR(100),
        last_used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        revoked_at TIMESTAMP
      )
    `;
    console.log('✅ Created table: api_keys');

    // Create API usage logs table
    await sql`
      CREATE TABLE IF NOT EXISTS developer.api_usage_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        api_key_id UUID NOT NULL REFERENCES developer.api_keys(id),
        endpoint VARCHAR(100) NOT NULL,
        method VARCHAR(10) NOT NULL,
        policy_id VARCHAR(66),
        gas_used NUMERIC(20, 0),
        gas_cost_eth NUMERIC(20, 18),
        gas_cost_usd NUMERIC(10, 6),
        response_time_ms INTEGER,
        ip_address INET,
        user_agent TEXT,
        success BOOLEAN DEFAULT true,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Created table: api_usage_logs');

    // Create withdrawal requests table
    await sql`
      CREATE TABLE IF NOT EXISTS developer.withdrawal_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        api_key_id UUID NOT NULL REFERENCES developer.api_keys(id),
        amount_eth NUMERIC(20, 18) NOT NULL,
        to_address VARCHAR(42) NOT NULL,
        tx_hash VARCHAR(66),
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      )
    `;
    console.log('✅ Created table: withdrawal_requests');

    // Add columns to policies table
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'policies' AND column_name = 'created_via_api') THEN
          ALTER TABLE public.policies ADD COLUMN created_via_api BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'policies' AND column_name = 'developer_api_key_id') THEN
          ALTER TABLE public.policies ADD COLUMN developer_api_key_id UUID REFERENCES developer.api_keys(id);
        END IF;
      END $$;
    `;
    console.log('✅ Updated table: policies');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_cli_auth_device_code ON developer.cli_auth_requests(device_code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_cli_auth_status ON developer.cli_auth_requests(status, expires_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON developer.api_keys(owner_address)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_api_keys_active ON developer.api_keys(is_active, tier)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_usage_api_key ON developer.api_usage_logs(api_key_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_usage_created ON developer.api_usage_logs(created_at)`;
    console.log('✅ Created indexes');

    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

migrate();
