-- SHIELD Developer Platform Database Schema
-- Migration: 002_add_logging_webhooks
-- Created: 2024-02-27

BEGIN;

-- API request logs (detailed logging for monitoring)
CREATE TABLE IF NOT EXISTS developer.api_request_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID REFERENCES developer.api_keys(id),
    method VARCHAR(10) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    query_params JSONB,
    request_body_hash VARCHAR(64),
    response_status INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    ip_address INET,
    user_agent TEXT,
    error_code VARCHAR(50),
    error_message TEXT,
    rate_limit_hit BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Webhook configurations
CREATE TABLE IF NOT EXISTS developer.webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES developer.api_keys(id),
    url TEXT NOT NULL,
    secret VARCHAR(64) NOT NULL, -- For signing payloads
    events TEXT[] NOT NULL, -- ['policy.created', 'policy.updated', etc.]
    is_active BOOLEAN DEFAULT true,
    failure_count INTEGER DEFAULT 0,
    last_success_at TIMESTAMP,
    last_failure_at TIMESTAMP,
    last_failure_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS developer.webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES developer.webhooks(id),
    event_type VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    signature VARCHAR(128) NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    attempt_count INTEGER DEFAULT 1,
    delivered_at TIMESTAMP,
    failed_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Policy creation tracking
CREATE TABLE IF NOT EXISTS developer.policy_creations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES developer.api_keys(id),
    policy_id VARCHAR(66) UNIQUE NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    content_size_bytes INTEGER NOT NULL,
    ipfs_hash VARCHAR(64),
    encryption_key_hash VARCHAR(64), -- Hash only, not the key
    gas_used NUMERIC(20, 0),
    gas_cost_eth NUMERIC(20, 18),
    gas_cost_usd NUMERIC(10, 6),
    transaction_hash VARCHAR(66),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    confirmed_at TIMESTAMP
);

-- Billing/subscription tracking for USDC payments
CREATE TABLE IF NOT EXISTS developer.billing_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES developer.api_keys(id),
    tier VARCHAR(20) NOT NULL,
    payment_token VARCHAR(42) NOT NULL, -- USDC contract address
    payment_amount NUMERIC(20, 6) NOT NULL,
    tx_hash VARCHAR(66) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    started_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP,
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_request_logs_api_key ON developer.api_request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_request_logs_created ON developer.api_request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_endpoint ON developer.api_request_logs(endpoint, created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_status ON developer.api_request_logs(response_status);

CREATE INDEX IF NOT EXISTS idx_webhooks_api_key ON developer.webhooks(api_key_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON developer.webhooks(is_active);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON developer.webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created ON developer.webhook_deliveries(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON developer.webhook_deliveries(delivered_at, failed_at);

CREATE INDEX IF NOT EXISTS idx_policy_creations_api_key ON developer.policy_creations(api_key_id);
CREATE INDEX IF NOT EXISTS idx_policy_creations_policy ON developer.policy_creations(policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_creations_created ON developer.policy_creations(created_at);

CREATE INDEX IF NOT EXISTS idx_billing_api_key ON developer.billing_subscriptions(api_key_id);
CREATE INDEX IF NOT EXISTS idx_billing_status ON developer.billing_subscriptions(status);

COMMIT;
