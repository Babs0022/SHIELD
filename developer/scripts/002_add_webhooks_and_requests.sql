-- SHIELD Developer Platform Database Schema
-- Migration: 002_add_webhooks_and_requests
-- Created: 2024-02-27

BEGIN;

-- Webhook configurations per API key
CREATE TABLE developer.webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES developer.api_keys(id) ON DELETE CASCADE,

    -- Webhook URL and secret
    url TEXT NOT NULL,
    secret VARCHAR(64) NOT NULL, -- For HMAC signature

    -- Events to subscribe to
    events TEXT[] DEFAULT ARRAY['policy.created', 'policy.updated', 'policy.accessed'],

    -- Status
    is_active BOOLEAN DEFAULT true,
    failure_count INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_delivered_at TIMESTAMP
);

-- Detailed API request logs (separate from usage logs)
CREATE TABLE developer.api_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES developer.api_keys(id),

    -- Request details
    request_id VARCHAR(36) UNIQUE NOT NULL,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(255) NOT NULL,
    query_params JSONB,
    request_body JSONB,
    request_headers JSONB,

    -- Response details
    status_code INTEGER NOT NULL,
    response_body JSONB,
    response_headers JSONB,
    error_code VARCHAR(50),
    error_message TEXT,

    -- Timing
    request_started_at TIMESTAMP NOT NULL,
    response_sent_at TIMESTAMP NOT NULL,
    duration_ms INTEGER NOT NULL,

    -- Client info
    ip_address INET,
    user_agent TEXT,
    cf_ray VARCHAR(45),
    country_code VARCHAR(2),

    -- Rate limiting
    rate_limit_tier VARCHAR(20),
    rate_limit_remaining INTEGER,
    rate_limit_reset_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Webhook delivery logs
CREATE TABLE developer.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES developer.webhooks(id) ON DELETE CASCADE,

    -- Event details
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,

    -- Delivery details
    attempt_number INTEGER DEFAULT 1,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'delivered', 'failed', 'retrying')),

    -- Request/Response
    request_headers JSONB,
    request_body TEXT,
    response_status INTEGER,
    response_body TEXT,
    response_headers JSONB,

    -- Error details
    error_message TEXT,

    -- Timing
    sent_at TIMESTAMP,
    responded_at TIMESTAMP,
    duration_ms INTEGER,

    -- Retry scheduling
    next_retry_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW()
);

-- Policies created via API (extension of public.policies)
CREATE TABLE developer.policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES developer.api_keys(id),

    -- Policy reference
    policy_id VARCHAR(66) UNIQUE NOT NULL,
    policy_address VARCHAR(42),

    -- Content info
    content_name VARCHAR(255),
    content_type VARCHAR(100),
    content_hash VARCHAR(64),
    content_size_bytes INTEGER,

    -- IPFS info
    ipfs_hash VARCHAR(100),
    ipfs_size INTEGER,

    -- Encryption
    encryption_iv VARCHAR(32),
    encryption_tag VARCHAR(32),

    -- Transaction info
    tx_hash VARCHAR(66),
    gas_used NUMERIC(20, 0),
    gas_cost_eth NUMERIC(20, 18),
    gas_cost_usd NUMERIC(10, 6),

    -- Access settings
    access_price_eth NUMERIC(20, 18) DEFAULT 0,
    duration_seconds INTEGER DEFAULT 2592000, -- 30 days

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'revoked', 'expired')),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

-- Gas price tracking for estimations
CREATE TABLE developer.gas_price_cache (
    id SERIAL PRIMARY KEY,
    chain_id INTEGER DEFAULT 1,
    gas_price_gwei NUMERIC(20, 9) NOT NULL,
    base_fee_gwei NUMERIC(20, 9),
    priority_fee_gwei NUMERIC(20, 9),
    block_number BIGINT,
    fetched_at TIMESTAMP DEFAULT NOW()
);

-- API key rate limit tracking (daily)
CREATE TABLE developer.rate_limit_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES developer.api_keys(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    request_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(api_key_id, date)
);

-- Billing transactions (USDC payments)
CREATE TABLE developer.billing_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES developer.api_keys(id),

    -- Payment details
    tier_from VARCHAR(20),
    tier_to VARCHAR(20) NOT NULL,
    amount_usdc NUMERIC(20, 6) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,

    -- Verification
    verified_at TIMESTAMP,
    verified_by VARCHAR(20) CHECK (verified_by IN ('webhook', 'cron', 'manual')),

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),

    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_webhooks_api_key ON developer.webhooks(api_key_id);
CREATE INDEX idx_webhooks_active ON developer.webhooks(is_active);

CREATE INDEX idx_api_requests_api_key ON developer.api_request_logs(api_key_id);
CREATE INDEX idx_api_requests_created ON developer.api_request_logs(created_at);
CREATE INDEX idx_api_requests_request_id ON developer.api_request_logs(request_id);
CREATE INDEX idx_api_requests_status ON developer.api_request_logs(status_code);

CREATE INDEX idx_webhook_deliveries_webhook ON developer.webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_status ON developer.webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_retry ON developer.webhook_deliveries(next_retry_at)
WHERE status IN ('pending', 'retrying');
CREATE INDEX idx_webhook_deliveries_created ON developer.webhook_deliveries(created_at);

CREATE INDEX idx_policies_api_key ON developer.policies(api_key_id);
CREATE INDEX idx_policies_policy_id ON developer.policies(policy_id);
CREATE INDEX idx_policies_status ON developer.policies(status);
CREATE INDEX idx_policies_created ON developer.policies(created_at);

CREATE INDEX idx_gas_cache_chain ON developer.gas_price_cache(chain_id, fetched_at DESC);

CREATE INDEX idx_rate_limits_key_date ON developer.rate_limit_counters(api_key_id, date);

CREATE INDEX idx_billing_api_key ON developer.billing_transactions(api_key_id);
CREATE INDEX idx_billing_status ON developer.billing_transactions(status);
CREATE INDEX idx_billing_tx ON developer.billing_transactions(tx_hash);

COMMIT;
