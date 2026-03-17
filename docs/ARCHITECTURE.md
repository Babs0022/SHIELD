# SHIELD — System Architecture

This document provides a deep technical overview of how SHIELD is structured, how its components interact, and the design decisions that make it a trustless, end-to-end encrypted sharing platform.

---

## Table of Contents

1. [High-Level Overview](#high-level-overview)
2. [Component Diagram](#component-diagram)
3. [Frontend Architecture](#frontend-architecture)
4. [Smart Contract Layer](#smart-contract-layer)
5. [Backend API Layer](#backend-api-layer)
6. [Database Layer](#database-layer)
7. [Storage Layer (IPFS)](#storage-layer-ipfs)
8. [Authentication Flow](#authentication-flow)
9. [Encryption Model](#encryption-model)
10. [Data Flow: Creating a Secure Share](#data-flow-creating-a-secure-share)
11. [Data Flow: Accessing Shared Content](#data-flow-accessing-shared-content)
12. [Rate Limiting Architecture](#rate-limiting-architecture)
13. [Tier System](#tier-system)

---

## High-Level Overview

SHIELD is a **hybrid decentralized application (dApp)** that combines:

| Layer | Technology | Role |
|-------|-----------|------|
| Client | Next.js / React / TypeScript | UI, client-side encryption/decryption |
| Smart Contract | Solidity on Base (Ethereum L2) | Trustless access policy enforcement |
| Backend API | Next.js API Routes (Node.js) | Metadata storage, SIWE verification, rate limiting |
| Database | PostgreSQL (Neon serverless) | Policies, users, access logs, rate limits |
| Decentralized Storage | IPFS via Pinata | Encrypted content |
| Wallet / Auth | SIWE + Wagmi + Reown AppKit | Passwordless, wallet-based authentication |

The core design principle is that **the server never sees plaintext content or decryption keys**. Encryption and decryption happen exclusively in the user's browser.

---

## Component Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                          │
│                                                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  Next.js UI  │    │  Web Crypto  │    │  Wagmi / AppKit  │  │
│  │  (React)     │◄──►│  (AES-GCM   │    │  (Wallet Conn.)  │  │
│  │              │    │   256-bit)   │    │                  │  │
│  └──────┬───────┘    └──────────────┘    └────────┬─────────┘  │
│         │                                          │            │
└─────────┼──────────────────────────────────────────┼────────────┘
          │                                          │
          ▼                                          ▼
┌─────────────────────┐                  ┌─────────────────────┐
│  Next.js API Routes │                  │   Base Blockchain   │
│  (Vercel / Server)  │                  │  (Shield.sol)       │
│                     │                  │                     │
│  /api/signIn        │                  │  createPolicy()     │
│  /api/storeMetadata │                  │  logAttempt()       │
│  /api/verify-siwe   │                  │  isPolicyValid()    │
│  /api/getPolicy/... │                  │                     │
│  /api/user/...      │                  └─────────────────────┘
│  /api/admin/...     │
│  /api/access-logs   │
│  /api/health        │
└──────────┬──────────┘
           │
    ┌──────┴───────┐
    │              │
    ▼              ▼
┌──────────┐  ┌──────────┐
│PostgreSQL│  │   IPFS   │
│ (Neon)   │  │ (Pinata) │
└──────────┘  └──────────┘
```

---

## Frontend Architecture

The frontend is a **Next.js 16 App Router** application written in TypeScript.

### Directory Structure

```
frontend/src/
├── app/
│   ├── api/                  # API route handlers (server-side)
│   ├── admin/                # Admin dashboard pages
│   ├── profile/              # User profile page
│   ├── access/               # Content access page
│   ├── r/[policyId]/         # Share recipient landing page
│   ├── login/                # Authentication page
│   ├── docs/                 # In-app documentation page
│   ├── upgrade/              # Tier upgrade page
│   ├── tos/                  # Terms of Service page
│   ├── privacy/              # Privacy Policy page
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Landing page
├── components/
│   ├── SecureLinkForm.tsx    # Core share creation form
│   ├── MyLinks.tsx           # User's link management
│   ├── Navbar.tsx            # Top navigation bar
│   ├── ProfileInfo.tsx       # Profile display/edit
│   ├── SecuritySettings.tsx  # Security preferences
│   ├── StatsCard.tsx         # Statistics display
│   ├── SkeletonLoader.tsx    # Loading placeholder
│   ├── Spinner.tsx           # Loading spinner
│   ├── ConfirmModal.tsx      # Confirmation dialogs
│   └── UserMenu.tsx          # Dropdown user menu
├── config/
│   ├── appkit.ts             # Reown AppKit / WalletConnect setup
│   ├── chains.ts             # Supported EVM chains
│   └── admin.ts              # Admin wallet addresses
├── contexts/                 # React context providers
├── lib/
│   ├── db.ts                 # PostgreSQL client (Neon)
│   ├── db-init.ts            # Database schema initialization
│   ├── rateLimit.ts          # Rate limiting logic
│   ├── ShieldABI.ts          # Contract ABI
│   ├── Shield.json           # Contract ABI (JSON)
│   └── logger.ts             # Logging utility
└── types/                    # TypeScript type definitions
```

### Key Components

#### `SecureLinkForm.tsx`
The central component of the application. Handles:
- File or text input from the user
- Client-side AES-GCM-256 encryption via Web Crypto API
- IPFS upload via Pinata API (through Next.js API route proxy)
- Smart contract interaction to create an `AccessPolicy`
- Metadata storage in the database
- Secure link generation

#### `MyLinks.tsx`
Displays a user's previously created shared links, including:
- Policy status (active, revoked, expired)
- Access statistics (views, last access time)
- Revoke functionality

#### `Navbar.tsx`
Top-level navigation with:
- Wallet connection state (via Wagmi hooks)
- User menu (profile, admin dashboard if applicable)
- Responsive mobile menu

### State Management

- **React Query (TanStack Query)**: Server state, caching, and data fetching
- **Wagmi**: Ethereum/wallet state
- **React Context**: Auth state, user data

---

## Smart Contract Layer

The `Shield.sol` contract is deployed on the **Base blockchain** (Ethereum L2).

### Contract: `Shield`

**Address:** Configured via `NEXT_PUBLIC_CONTRACT_ADDRESS` environment variable.

#### Data Structures

```solidity
struct AccessPolicy {
    address sender;       // Wallet that created the policy
    address recipient;    // Wallet authorized to access content
    uint64 expiry;        // Unix timestamp when policy expires
    uint32 maxAttempts;   // Maximum number of access attempts allowed
    uint32 attempts;      // Number of access attempts logged so far
    bool valid;           // Whether the policy is still valid
}

mapping(bytes32 => AccessPolicy) public policies;
```

#### Events

| Event | Parameters | Description |
|-------|-----------|-------------|
| `PolicyCreated` | `policyId, sender, recipient, expiry, maxAttempts` | Emitted when a new access policy is created |
| `VerificationAttempt` | `policyId, success` | Emitted when an access attempt is logged |

#### Functions

| Function | Visibility | Description |
|----------|-----------|-------------|
| `createPolicy(bytes32, address, uint256, uint256)` | external | Create a new access policy |
| `logAttempt(bytes32, bool)` | external | Log an access attempt (recipient only) |
| `isPolicyValid(bytes32)` | external view | Check if a policy is currently valid |

### Why Base?

- Low transaction costs (important for UX)
- EVM-compatible (works with all standard Ethereum tooling)
- High throughput and fast finality
- Strong ecosystem support

---

## Backend API Layer

All API routes are Next.js Route Handlers located in `frontend/src/app/api/`. They run server-side (Node.js runtime on Vercel).

### Authentication

All authenticated routes expect a JWT Bearer token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

JWTs are signed with `JWT_SECRET` using HS256 and expire after 24 hours. They are issued upon successful SIWE sign-in.

### API Routes Summary

See [API Reference](./API.md) for complete details.

---

## Database Layer

SHIELD uses **PostgreSQL** (via [Neon](https://neon.tech/) serverless) for storing non-sensitive metadata.

### Tables

| Table | Purpose |
|-------|---------|
| `users` | User profiles, tier, login timestamps, onboarding |
| `policies` | Policy metadata linking policy IDs to IPFS CIDs |
| `access_logs` | Record of every access attempt (success/failure) |
| `rate_limits` | Sliding window rate limit tracking per wallet |
| `onboarding_surveys` | User survey responses from onboarding |

See [Database Reference](./DATABASE.md) for full schema.

---

## Storage Layer (IPFS)

Encrypted content is stored on **IPFS** (InterPlanetary File System) via **Pinata**:

1. The frontend encrypts content with AES-GCM-256.
2. The ciphertext is uploaded to Pinata via their API.
3. Pinata returns a **CID** (Content Identifier) — a cryptographic hash of the content.
4. The CID is stored in the `policies` table, alongside the policy ID.
5. When a recipient accesses the link, the backend fetches the encrypted bytes from IPFS using the CID.
6. The frontend decrypts the bytes using the secret key embedded in the URL fragment (`#key`).

Because the data is encrypted before upload, Pinata (and anyone with access to IPFS) sees only ciphertext — never the original content.

---

## Authentication Flow

SHIELD uses **Sign-In with Ethereum (SIWE)** for authentication.

```
1. User connects wallet (via Reown AppKit / WalletConnect)
2. Frontend requests a nonce from the backend (or generates one locally)
3. User signs a structured SIWE message with their wallet private key
4. Frontend sends { message, signature } to POST /api/signIn
5. Backend:
   a. Verifies the SIWE signature
   b. Creates/updates user record in DB
   c. Issues a JWT (HS256, 24h expiry) signed with JWT_SECRET
6. Frontend stores the JWT in memory/context
7. Subsequent authenticated API calls include JWT as Bearer token
```

This flow means:
- **No passwords** or email addresses required
- **Wallet ownership** is the sole authentication factor
- **Phishing-resistant**: SIWE messages are domain-bound

---

## Encryption Model

### Key Generation

A unique, random 256-bit AES-GCM key is generated for every share:

```typescript
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true, // extractable
  ['encrypt', 'decrypt']
);
```

### Encryption

The content is encrypted with a random 96-bit IV:

```typescript
const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV
const ciphertext = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  plaintext
);
```

### Key Embedding

The raw key bytes and IV are concatenated and base64url-encoded, then embedded in the URL fragment:

```
https://shield.app/r/<policyId>#<base64url(iv + rawKey)>
```

The **URL fragment (`#...`) is never sent to the server** — it exists only in the browser. This is the critical security property that ensures even the backend operator cannot decrypt content.

### Decryption

When the recipient opens the link:
1. The browser reads the key from `window.location.hash`
2. The frontend fetches the ciphertext from IPFS (via the backend proxy)
3. The key and IV are extracted from the hash
4. The browser decrypts the ciphertext using `crypto.subtle.decrypt`

---

## Data Flow: Creating a Secure Share

```
Sender's Browser                 Backend API              Base Blockchain          IPFS (Pinata)
      │                               │                         │                       │
      │─ Encrypt content ────────────►│                         │                       │
      │  (AES-GCM-256, in browser)    │                         │                       │
      │                               │                         │                       │
      │─ Upload ciphertext ──────────────────────────────────────────────────────────►  │
      │  (via /api proxy)             │                         │                       │
      │◄─ CID returned ──────────────────────────────────────────────────────────────── │
      │                               │                         │                       │
      │─ createPolicy() tx ─────────────────────────────────►   │                       │
      │  (on-chain, recipient,         │                         │                       │
      │   expiry, maxAttempts)         │                         │                       │
      │◄─ policyId (tx receipt) ───────────────────────────────  │                       │
      │                               │                         │                       │
      │─ POST /api/storeMetadata ────►│                         │                       │
      │  {policyId, CID, recipient,   │                         │                       │
      │   expiry, maxAttempts, ...}   │                         │                       │
      │                               │─ INSERT INTO policies   │                       │
      │◄─ { link } ─────────────────  │                         │                       │
      │                               │                         │                       │
      │  Display secure link to user  │                         │                       │
      │  (link contains #secretKey)   │                         │                       │
```

---

## Data Flow: Accessing Shared Content

```
Recipient's Browser              Backend API              Base Blockchain          IPFS (Pinata)
      │                               │                         │                       │
      │  Opens /r/<policyId>#<key>    │                         │                       │
      │                               │                         │                       │
      │─ GET /api/getPolicy/<id> ────►│                         │                       │
      │                               │─ SELECT FROM policies   │                       │
      │◄─ { resourceCid, recipient }  │                         │                       │
      │                               │                         │                       │
      │  Connect wallet, sign SIWE    │                         │                       │
      │                               │                         │                       │
      │─ POST /api/verify-siwe ──────►│                         │                       │
      │  { message, signature,        │─ Verify SIWE sig        │                       │
      │    policyId }                 │─ Check DB policy        │                       │
      │                               │─ isPolicyValid() ──────►│                       │
      │◄─ { success: true } ─────────  │◄─ bool ───────────────  │                       │
      │                               │                         │                       │
      │  logAttempt() tx ────────────────────────────────────►  │                       │
      │  (on-chain, signed by         │                         │                       │
      │   recipient's wallet)         │                         │                       │
      │◄─ tx confirmed ──────────────────────────────────────── │                       │
      │                               │                         │                       │
      │─ GET /api/getEncryptedContent/<CID> ─────────────────────────────────────────►  │
      │◄─ { encryptedData } ──────────────────────────────────────────────────────────  │
      │                               │                         │                       │
      │  Decrypt using #key           │                         │                       │
      │  (in browser, never sent)     │                         │                       │
      │                               │                         │                       │
      │  Display/download content     │                         │                       │
```

---

## Rate Limiting Architecture

Rate limiting uses a **sliding window** algorithm backed by the `rate_limits` PostgreSQL table.

### Limits by Tier

| Tier | Requests / Minute | Daily Links |
|------|--------------------|-------------|
| Free | 10 | 5 |
| Pro  | 60 | 50 |

### Algorithm

1. Delete all records for the wallet older than the window start time.
2. Count remaining records (requests within current window).
3. If count ≥ limit: reject with `429 Too Many Requests` and `Retry-After` header.
4. Otherwise: insert a new record and allow the request.

### Rate Limit Response Headers

```
HTTP/1.1 429 Too Many Requests
Retry-After: 42
X-RateLimit-Remaining: 0
```

---

## Tier System

| Feature | Free Tier | Pro Tier |
|---------|-----------|----------|
| Daily link creation | 5 links/day | 50 links/day |
| Max file size | 30 MB | 1 GB |
| Text content limit | 500 characters | Unlimited |
| Multi-file sharing | ✗ | ✓ |
| API rate limit | 10 req/min | 60 req/min |
| Subscription duration | — | 30 days |

Users can upgrade to Pro via `POST /api/upgrade` after completing payment verification.

---

*For more details, see:*
- *[API Reference](./API.md)*
- *[Smart Contract Reference](./SMART_CONTRACT.md)*
- *[Database Schema](./DATABASE.md)*
- *[Security Model](./SECURITY.md)*
- *[Deployment Guide](./DEPLOYMENT.md)*
