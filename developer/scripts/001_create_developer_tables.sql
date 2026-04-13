-- SHIELD Developer Platform Database Schema
-- Migration: 001_create_developer_tables
-- Created: 2024-02-27

BEGIN;

-- Create developer schema
CREATE SCHEMA IF NOT EXISTS developer;

-- CLI authentication requests (device flow)
CREATE TABLE developer.cli_auth_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_code VARCHAR(10) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired', 'cancelled')),
    owner_address VARCHAR(42), -- Filled after auth
    api_key_id UUID,
    ip_address INET,
    user_agent TEXT,
    callback_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT NOW() + INTERVAL '10 minutes',
    completed_at TIMESTAMP
);

-- API Keys table (main developer authentication)
CREATE TABLE developer.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Ownership (links to main app users table)
    owner_address VARCHAR(42) NOT NULL REFERENCES public.users(wallet_address),

    -- API Authentication
    api_key_hash VARCHAR(64) NOT NULL UNIQUE,
    api_key_prefix VARCHAR(16) NOT NULL,

    -- EOA for blockchain transactions
    eoa_address VARCHAR(42) NOT NULL UNIQUE,
    encrypted_eoa_key TEXT NOT NULL,

    -- Balance tracking
    balance_eth NUMERIC(20, 18) DEFAULT 0,

    -- Tier and limits
    tier VARCHAR(20) DEFAULT 'free' CHECK (tier IN ('free', 'starter', 'pro', 'enterprise')),
    monthly_policy_limit INTEGER DEFAULT 10,
    monthly_policy_count INTEGER DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    label VARCHAR(100),
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

-- API usage logs (for billing and analytics)
CREATE TABLE developer.api_usage_logs (
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
);

-- Withdrawal requests
CREATE TABLE developer.withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES developer.api_keys(id),
    amount_eth NUMERIC(20, 18) NOT NULL,
    to_address VARCHAR(42) NOT NULL,
    tx_hash VARCHAR(66),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Add columns to existing policies table to track API-created policies
ALTER TABLE public.policies
ADD COLUMN IF NOT EXISTS created_via_api BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS developer_api_key_id UUID REFERENCES developer.api_keys(id);

-- Create indexes for performance
CREATE INDEX idx_cli_auth_device_code ON developer.cli_auth_requests(device_code);
CREATE INDEX idx_cli_auth_status ON developer.cli_auth_requests(status, expires_at);
CREATE INDEX idx_cli_auth_owner ON developer.cli_auth_requests(owner_address);

CREATE INDEX idx_api_keys_owner ON developer.api_keys(owner_address);
CREATE INDEX idx_api_keys_active ON developer.api_keys(is_active, tier);
CREATE INDEX idx_api_keys_eoa ON developer.api_keys(eoa_address);

CREATE INDEX idx_usage_api_key ON developer.api_usage_logs(api_key_id);
CREATE INDEX idx_usage_created ON developer.api_usage_logs(created_at);
CREATE INDEX idx_usage_endpoint ON developer.api_usage_logs(endpoint, created_at);

CREATE INDEX idx_policies_api_created ON public.policies(developer_api_key_id)
WHERE created_via_api = true;

COMMIT;