# SHIELD — Database Schema

This document describes the PostgreSQL database schema used by SHIELD, including all tables, columns, indexes, and their purposes.

---

## Table of Contents

1. [Overview](#overview)
2. [Tables](#tables)
   - [users](#users)
   - [policies](#policies)
   - [access_logs](#access_logs)
   - [rate_limits](#rate_limits)
   - [onboarding_surveys](#onboarding_surveys)
3. [Indexes](#indexes)
4. [Schema Initialization](#schema-initialization)
5. [Database Provider](#database-provider)

---

## Overview

SHIELD uses a **serverless PostgreSQL** database provided by [Neon](https://neon.tech/). The schema stores only **non-sensitive metadata** — encrypted content lives on IPFS, and decryption keys exist only in secure share links (URL fragments).

No plaintext content or cryptographic keys are ever stored in the database.

---

## Tables

---

### `users`

Stores user profile information and subscription tier.

```sql
CREATE TABLE IF NOT EXISTS users (
    wallet_address         VARCHAR(42)  PRIMARY KEY,
    first_login_at         TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    last_login_at          TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP,
    display_name           TEXT,
    pfp_url                TEXT,
    onboarding_completed   BOOLEAN      DEFAULT FALSE,
    tier                   VARCHAR(20)  DEFAULT 'free',
    daily_link_count       INTEGER      DEFAULT 0,
    last_link_creation_date TIMESTAMPTZ,
    subscription_expires_at TIMESTAMPTZ
);
```

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `wallet_address` | `VARCHAR(42)` | Primary key. Ethereum wallet address (checksummed or lowercase). |
| `first_login_at` | `TIMESTAMPTZ` | Timestamp of the user's first sign-in. |
| `last_login_at` | `TIMESTAMPTZ` | Timestamp of the user's most recent sign-in. |
| `display_name` | `TEXT` | Optional user-set display name. |
| `pfp_url` | `TEXT` | Optional URL of the user's profile picture. |
| `onboarding_completed` | `BOOLEAN` | Whether the user has completed the onboarding flow. |
| `tier` | `VARCHAR(20)` | User's subscription tier: `'free'` or `'pro'`. |
| `daily_link_count` | `INTEGER` | Number of links created today. Reset daily. |
| `last_link_creation_date` | `TIMESTAMPTZ` | Date of the last link creation (used for daily limit resets). |
| `subscription_expires_at` | `TIMESTAMPTZ` | When the Pro subscription expires (null for free tier). |

---

### `policies`

Stores metadata about each encrypted share created on SHIELD.

```sql
CREATE TABLE IF NOT EXISTS policies (
    id              SERIAL       PRIMARY KEY,
    policy_id       VARCHAR(255) UNIQUE NOT NULL,
    creator_id      VARCHAR(42)  NOT NULL,
    resource_cid    TEXT         NOT NULL,
    recipient_address VARCHAR(42) NOT NULL,
    mime_type       VARCHAR(255),
    is_text         BOOLEAN      DEFAULT FALSE,
    expiry          BIGINT       NOT NULL,
    max_attempts    INTEGER      NOT NULL,
    attempts        INTEGER      DEFAULT 0,
    valid           BOOLEAN      DEFAULT TRUE,
    status          VARCHAR(50)  DEFAULT 'active',
    content_length  BIGINT,
    created_at      TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL` | Auto-incrementing internal ID. |
| `policy_id` | `VARCHAR(255)` | Unique policy identifier (matches the on-chain `bytes32` policyId). |
| `creator_id` | `VARCHAR(42)` | Wallet address of the content creator. |
| `resource_cid` | `TEXT` | IPFS CID of the encrypted content. |
| `recipient_address` | `VARCHAR(42)` | Wallet address of the authorized recipient. |
| `mime_type` | `VARCHAR(255)` | MIME type of the original content (e.g. `application/pdf`, `image/png`). |
| `is_text` | `BOOLEAN` | `true` if the content is a text message; `false` if it is a file. |
| `expiry` | `BIGINT` | Unix timestamp (seconds) when the policy expires. Mirrors the on-chain value. |
| `max_attempts` | `INTEGER` | Maximum allowed access attempts. Mirrors the on-chain value. |
| `attempts` | `INTEGER` | Access attempt counter (informational; authoritative value is on-chain). |
| `valid` | `BOOLEAN` | Whether the policy is considered valid in the database. |
| `status` | `VARCHAR(50)` | Human-readable status: `'active'`, `'revoked'`, or `'expired'`. |
| `content_length` | `BIGINT` | Size of the content in bytes (files) or characters (text). |
| `created_at` | `TIMESTAMPTZ` | When the policy was stored in the database. |

**Notes:**
- The `status` field is checked before the on-chain `isPolicyValid()` call. If status is `'revoked'`, access is denied immediately without querying the blockchain.
- The database is the **source of truth for the IPFS CID** — the on-chain contract only stores access control rules.

---

### `access_logs`

Records every access attempt against a policy, both successful and failed.

```sql
CREATE TABLE IF NOT EXISTS access_logs (
    id                 SERIAL       PRIMARY KEY,
    policy_id          VARCHAR(255) NOT NULL,
    recipient_address  VARCHAR(42)  NOT NULL,
    success            BOOLEAN      DEFAULT TRUE,
    ip_address         VARCHAR(45),
    accessed_at        TIMESTAMPTZ  DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL` | Auto-incrementing internal ID. |
| `policy_id` | `VARCHAR(255)` | The policy that was accessed. |
| `recipient_address` | `VARCHAR(42)` | Wallet address of the person attempting access. |
| `success` | `BOOLEAN` | Whether the access attempt succeeded. |
| `ip_address` | `VARCHAR(45)` | IP address of the requester (from `x-forwarded-for` or `x-real-ip` headers). IPv6 supported (up to 45 chars). |
| `accessed_at` | `TIMESTAMPTZ` | Timestamp of the access attempt. |

**Notes:**
- Failed attempts are also logged (e.g. wrong wallet, revoked policy, expired policy).
- This table is queried by the `GET /api/access-logs` endpoint and displayed in the admin dashboard.

---

### `rate_limits`

Tracks API requests per wallet address for sliding-window rate limiting.

```sql
CREATE TABLE IF NOT EXISTS rate_limits (
    id             SERIAL      PRIMARY KEY,
    wallet_address VARCHAR(42) NOT NULL,
    requested_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL` | Auto-incrementing internal ID. |
| `wallet_address` | `VARCHAR(42)` | The wallet address making the request. |
| `requested_at` | `TIMESTAMPTZ` | Timestamp of the request. |

**Notes:**
- Old records are pruned automatically on each rate limit check (records older than the window start are deleted).
- The number of rows for a wallet within the current window determines whether the request is allowed.
- See [Architecture — Rate Limiting](./ARCHITECTURE.md#rate-limiting-architecture) for algorithm details.

---

### `onboarding_surveys`

Stores user responses from the post-registration onboarding survey.

```sql
CREATE TABLE IF NOT EXISTS onboarding_surveys (
    id           SERIAL      PRIMARY KEY,
    user_address VARCHAR(42) REFERENCES users(wallet_address),
    primary_use  VARCHAR(255),
    how_heard    VARCHAR(255),
    created_at   TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Columns:**

| Column | Type | Description |
|--------|------|-------------|
| `id` | `SERIAL` | Auto-incrementing internal ID. |
| `user_address` | `VARCHAR(42)` | Foreign key referencing `users.wallet_address`. |
| `primary_use` | `VARCHAR(255)` | User's primary use case (e.g. `'business'`, `'personal'`). |
| `how_heard` | `VARCHAR(255)` | How the user found SHIELD (e.g. `'twitter'`, `'friend'`). |
| `created_at` | `TIMESTAMPTZ` | When the survey was submitted. |

---

## Indexes

```sql
-- Efficient rate limit lookups and pruning
CREATE INDEX IF NOT EXISTS idx_rate_limits_wallet_time
    ON rate_limits (wallet_address, requested_at);

-- Efficient access log lookups by policy
CREATE INDEX IF NOT EXISTS idx_access_logs_policy_id
    ON access_logs (policy_id);

-- Efficient access log lookups by time (admin analytics)
CREATE INDEX IF NOT EXISTS idx_access_logs_accessed_at
    ON access_logs (accessed_at);
```

---

## Schema Initialization

The schema is initialized automatically when the application starts. The `signIn` API route (`frontend/src/app/api/signIn/route.ts`) runs `CREATE TABLE IF NOT EXISTS` statements for all tables at module load time.

Additionally, `frontend/src/lib/db-init.ts` contains a standalone initialization function:

```typescript
import { initializeDatabase } from '@/lib/db-init';
await initializeDatabase();
```

This can be run manually if needed.

---

## Database Provider

SHIELD uses **[Neon](https://neon.tech/)** — a serverless PostgreSQL provider that:

- Scales to zero when idle (no cost for unused capacity)
- Auto-scales on demand
- Provides a standard PostgreSQL-compatible connection string
- Works seamlessly with Vercel's serverless functions

### Connection

The database client is defined in `frontend/src/lib/db.ts`:

```typescript
import { neon } from '@neondatabase/serverless';
const sql = neon(process.env.POSTGRES_URL!);
export default sql;
```

### Environment Variables

```env
POSTGRES_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

See [Deployment Guide — Environment Variables](./DEPLOYMENT.md#environment-variables) for the full list.
