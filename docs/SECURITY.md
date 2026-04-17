# SHIELD — Security Model

This document describes the security architecture of SHIELD, the assumptions it makes, the trust model it operates under, and known limitations.

---

## Table of Contents

1. [Core Security Guarantees](#core-security-guarantees)
2. [Threat Model](#threat-model)
3. [End-to-End Encryption](#end-to-end-encryption)
4. [Authentication Security](#authentication-security)
5. [Smart Contract Security](#smart-contract-security)
6. [Transport Security](#transport-security)
7. [Rate Limiting & Abuse Prevention](#rate-limiting--abuse-prevention)
8. [What SHIELD Does Not Protect Against](#what-shield-does-not-protect-against)
9. [Security Best Practices for Users](#security-best-practices-for-users)
10. [Responsible Disclosure](#responsible-disclosure)

---

## Core Security Guarantees

SHIELD is built on the following security properties:

| Property | How It's Achieved |
|----------|------------------|
| **Content confidentiality** | AES-GCM 256-bit encryption, performed client-side before any data leaves the browser |
| **Key confidentiality** | Decryption keys are embedded in URL fragments (`#key`), which browsers never send to servers |
| **Access control integrity** | Smart contract on Base blockchain enforces who can access, when, and how many times |
| **Identity verification** | SIWE (Sign-In with Ethereum) cryptographically proves wallet ownership |
| **Tamper evidence** | IPFS content addressing (CIDs) detects any modification to stored ciphertext |
| **Audit trail** | Every access attempt is logged on-chain (immutable) and in the database |

---

## Threat Model

### Who Is Being Protected Against?

| Threat Actor | Capability | SHIELD's Response |
|-------------|-----------|------------------|
| Network observer (MITM) | Intercepts HTTP traffic | All connections are TLS (HTTPS). Content is encrypted before upload. |
| Backend operator (Vercel, Neon, Pinata) | Reads database and IPFS storage | Database contains no plaintext content or keys. IPFS stores only ciphertext. |
| Unauthorized third parties | Obtains the share link without the key | URL fragments are not sent in HTTP requests; the `#key` is never logged or stored. |
| Wrong recipient | Has the link but not the authorized wallet | SIWE signature verification and on-chain policy check prevent access. |
| Attacker with the share URL | Observes the full URL | Still cannot decrypt without the `#key` fragment (which is after the `#` and not sent to servers). |

### Trusted Components

The following components are **trusted** by SHIELD:

- The **user's device and browser** (for local encryption/decryption)
- The **Base blockchain** (for enforcing access policies)
- The **user's wallet** (for signing SIWE messages and transactions)

### Semi-Trusted Components

The following are **semi-trusted** (they see metadata but not content):

- The **SHIELD backend** — sees policy metadata, wallet addresses, and IPFS CIDs, but never plaintext content or keys.
- **Pinata** — stores ciphertext. Cannot decrypt without the key.
- **Neon** — stores metadata. No content or keys.

---

## End-to-End Encryption

### Algorithm

SHIELD uses **AES-GCM** (Advanced Encryption Standard — Galois/Counter Mode) with a **256-bit key** and a **96-bit (12-byte) random IV**.

AES-GCM provides:
- **Confidentiality**: Without the key, the ciphertext reveals nothing about the plaintext.
- **Authenticity**: The GCM authentication tag detects any tampering with the ciphertext.
- **Integrity**: Modification of any byte causes decryption to fail.

### Key Generation

```typescript
// Browser's cryptographically secure random number generator
const key = await crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);
```

A unique key is generated for **every share**. Keys are never reused.

### URL Fragment Embedding

The key is embedded in the URL fragment:

```
https://shield.app/r/<policyId>#<base64url(iv || rawKey)>
```

**Why the fragment is secure:**
- The fragment (`#...`) is processed exclusively by the browser.
- HTTP requests do not include the fragment — it is never sent to any server.
- Server logs, reverse proxies, CDNs, and analytics tools never see the key.
- The fragment is also excluded from the HTTP `Referer` header when navigating away from the page.

### Link Security

The share link is shown **only once** to the creator. If lost, the content cannot be recovered.

> ⚠️ **Security Warning**: Anyone with the full share link can decrypt the content *if* they also hold the correct wallet. Treat share links like passwords — share them only through secure channels.

---

## Authentication Security

### SIWE (Sign-In with Ethereum)

SHIELD uses [EIP-4361](https://eips.ethereum.org/EIPS/eip-4361) Sign-In with Ethereum for authentication:

- **Domain-bound**: SIWE messages include the domain (`aud` field). A signature produced for `shield.app` cannot be replayed on another domain.
- **Replay-resistant**: Messages include a `nonce` and `issuedAt` timestamp.
- **Phishing-resistant**: Wallets display the full SIWE message to users before signing.

### JWT Tokens

After SIWE verification, the backend issues a **JWT** (JSON Web Token):

- **Algorithm**: HS256
- **Expiry**: 24 hours
- **Secret**: `JWT_SECRET` environment variable (never exposed to clients)
- **Payload**: Contains `address` (wallet), `iat` (issued at), `exp` (expiry)

JWTs are validated on every authenticated API call via `jwtVerify` from the `jose` library.

### Session Storage

JWTs are stored in the browser (typically in memory or `localStorage`). They are not stored in `HttpOnly` cookies in the current implementation.

> ⚠️ **Limitation**: Storing JWTs in `localStorage` or memory makes them accessible to JavaScript, which means XSS attacks could steal tokens. Consider migrating to `HttpOnly` cookies for improved security.

---

## Smart Contract Security

### Immutability

The Shield contract has no admin functions, no upgrade mechanism, and no `selfdestruct`. Once deployed, its logic is fixed and cannot be changed by any party — including the deployer.

This means:
- Access policies can only be created by the sender.
- Only the recipient can log access attempts.
- Policy rules cannot be retroactively modified.

### Access Controls

| Operation | Who Can Call |
|-----------|-------------|
| `createPolicy()` | Any wallet (becomes the sender) |
| `logAttempt()` | Only the designated recipient |
| `isPolicyValid()` | Anyone (read-only) |
| Read `policies` mapping | Anyone (public) |

### Validated Invariants

The contract enforces the following invariants on every `logAttempt()` call:

1. Policy must exist
2. Policy must be marked valid (`valid == true`)
3. Caller must be the designated recipient
4. Policy must not have expired (`block.timestamp < expiry`)
5. Remaining attempts must be > 0

### Formal Analysis

The contract is intentionally simple (54 lines of Solidity) to minimize attack surface. No external calls, no ETH transfers, and no complex state transitions.

---

## Transport Security

- All communication between the browser and backend uses **HTTPS/TLS**.
- Communication with IPFS (Pinata gateway) also uses HTTPS.
- Communication with the Base blockchain uses HTTPS RPC endpoints.

---

## Rate Limiting & Abuse Prevention

SHIELD implements **sliding window rate limiting** per wallet address:

| Tier | Limit |
|------|-------|
| Free | 10 API requests per minute |
| Pro | 60 API requests per minute |

Additionally, link creation is limited:

| Tier | Daily Limit |
|------|------------|
| Free | 5 links per day |
| Pro | 50 links per day |

Rate limit state is stored in the `rate_limits` PostgreSQL table and is automatically pruned.

When the limit is exceeded, the API returns:
```
HTTP 429 Too Many Requests
Retry-After: <seconds>
X-RateLimit-Remaining: 0
```

---

## What SHIELD Does Not Protect Against

SHIELD has **known limitations** that users should be aware of:

### 1. Compromised User Device

If the user's device is compromised (e.g., malware), an attacker can:
- Intercept the plaintext content before/after encryption
- Steal the decryption key from the URL fragment
- Steal the wallet private key (and thus sign SIWE messages)

SHIELD cannot protect against a fully compromised device.

### 2. Link Interception

If the share link (including the `#key` fragment) is intercepted (e.g., shared over an insecure channel, exposed in a screenshot), anyone with the correct wallet can decrypt the content.

**Mitigation**: Always share links via end-to-end encrypted messaging apps (Signal, encrypted email, etc.).

### 3. Recipient Wallet Compromise

If the recipient's wallet is compromised, the attacker can sign SIWE messages and access the content.

### 4. IPFS Content Persistence

Even after a policy expires or is revoked, the encrypted ciphertext may remain on IPFS. However, without the decryption key, this is computationally infeasible to decrypt.

**Note**: Pinata may unpin content after a period, but other IPFS nodes may have cached a copy.

### 5. Metadata Leakage

The following metadata is **not** encrypted:
- The recipient's wallet address (stored in DB and on-chain)
- The content's MIME type (stored in DB)
- The content length (stored in DB)
- Access timestamps (stored in DB and on-chain)

Wallet addresses are pseudonymous but can be linked to real-world identities.

### 6. XSS / JavaScript Injection

If an attacker can inject JavaScript into the SHIELD frontend (e.g., via XSS), they could intercept decryption keys from the URL fragment or plaintext content after decryption.

SHIELD relies on Next.js's built-in XSS protections and Content Security Policy headers.

---

## Security Best Practices for Users

1. **Only share links via secure channels** — use end-to-end encrypted messaging (e.g., Signal).
2. **Set appropriate expiry times** — shorter is more secure.
3. **Limit access attempts** — set `maxAttempts = 1` for maximum security.
4. **Revoke links you no longer need** — use the "Revoke" option in "My Links".
5. **Use a hardware wallet** — for signing SIWE messages and on-chain transactions.
6. **Verify the domain** — always confirm you are on the correct SHIELD domain before signing.

---

## Responsible Disclosure

If you discover a security vulnerability in SHIELD, please report it responsibly:

1. **Do not** create a public GitHub issue for security vulnerabilities.
2. Contact the project maintainer directly (see the repository's contact information).
3. Provide a clear description of the vulnerability, steps to reproduce, and potential impact.
4. Allow reasonable time for the issue to be addressed before public disclosure.

We appreciate responsible disclosure and will acknowledge your contribution.
