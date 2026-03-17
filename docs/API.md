# SHIELD — API Reference

This document describes all HTTP API endpoints exposed by the SHIELD backend (Next.js API Routes).

---

## Table of Contents

1. [Authentication](#authentication)
2. [Base URL](#base-url)
3. [Error Format](#error-format)
4. [Endpoints](#endpoints)
   - [Authentication](#authentication-endpoints)
   - [Policies & Content](#policies--content)
   - [User](#user)
   - [Access Logs](#access-logs)
   - [Admin](#admin)
   - [Upgrade](#upgrade)
   - [Health](#health)

---

## Authentication

Most endpoints require a JWT Bearer token issued by `POST /api/signIn`.

```
Authorization: Bearer <jwt_token>
```

JWTs use HS256 and expire after **24 hours**. The token payload contains:

```json
{
  "address": "0xYourWalletAddress",
  "iat": 1700000000,
  "exp": 1700086400
}
```

---

## Base URL

| Environment | URL |
|-------------|-----|
| Production | `https://your-domain.vercel.app` |
| Local dev | `http://localhost:3000` |

---

## Error Format

All error responses follow a consistent format:

```json
{
  "error": "Human-readable error message.",
  "details": "Optional additional detail or validation errors."
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| `200` | Success |
| `400` | Bad Request (invalid input) |
| `401` | Unauthorized (missing or invalid JWT/SIWE) |
| `403` | Forbidden (access denied, e.g. revoked policy) |
| `404` | Not Found |
| `413` | Payload Too Large (exceeds tier limits) |
| `429` | Too Many Requests (rate limit exceeded) |
| `500` | Internal Server Error |

---

## Endpoints

---

### Authentication Endpoints

---

#### `POST /api/signIn`

Authenticates a user via a SIWE (Sign-In with Ethereum) signature and returns a JWT.

**Request Body**

```json
{
  "message": { /* SIWE message object */ },
  "signature": "0x..."
}
```

**Response `200`**

```json
{
  "success": true,
  "user": {
    "wallet_address": "0x...",
    "display_name": "Alice",
    "pfp_url": "https://...",
    "onboarding_completed": false,
    "first_login_at": "2025-01-01T00:00:00.000Z",
    "last_login_at": "2025-06-01T12:00:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Notes**
- Creates the user record on first login (`INSERT ... ON CONFLICT DO UPDATE`).
- Also initializes all database tables if not present.
- The returned `token` must be stored client-side and sent as `Authorization: Bearer <token>` for subsequent requests.

---

#### `POST /api/verify-siwe`

Verifies a recipient's SIWE signature against an existing access policy, confirming they are the authorized recipient and that the policy is still valid.

**Request Body**

```json
{
  "message": { /* SIWE message object */ },
  "signature": "0x...",
  "policyId": "0xabc123..."
}
```

**Response `200`**

```json
{
  "success": true
}
```

**Error Responses**

| Status | Condition |
|--------|-----------|
| `400` | Invalid request body, or policy no longer valid (expired / max attempts reached) |
| `401` | Signer address does not match the policy's recipient address |
| `403` | Policy has been revoked |
| `404` | Policy not found in the database |
| `500` | SIWE verification failure or internal error |

**Notes**
- Logs every access attempt (success or failure) to the `access_logs` table.
- Reads the on-chain `AccessPolicy` via `isPolicyValid()` on the Shield contract.

---

### Policies & Content

---

#### `GET /api/getPolicy/[policyId]`

Retrieves non-sensitive metadata for a policy by its ID.

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `policyId` | string | The policy ID (bytes32 hex string) |

**Response `200`**

```json
{
  "resourceCid": "QmXyz...",
  "recipient_address": "0x...",
  "mimeType": "image/png",
  "isText": false
}
```

**Error Responses**

| Status | Condition |
|--------|-----------|
| `403` | Policy has been revoked or is invalid |
| `404` | Policy not found |
| `500` | Internal server error |

---

#### `POST /api/storeMetadata`

Stores policy metadata after content has been uploaded to IPFS and the access policy has been created on-chain.

**Authentication:** None (sender's wallet address is provided in the body as `creatorId`)

**Request Body**

```json
{
  "policyId": "0xabc...",
  "creatorId": "0xSenderAddress",
  "contentCid": "QmXyz...",
  "recipientAddress": "0xRecipientAddress",
  "mimeType": "application/pdf",
  "isText": false,
  "expiry": "86400",
  "maxAttempts": "3",
  "contentLength": 1048576
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `policyId` | string | ✓ | Unique policy ID (bytes32 hex from contract) |
| `creatorId` | string | ✓ | Sender's wallet address |
| `contentCid` | string | ✓ | IPFS CID of the encrypted content |
| `recipientAddress` | string | ✓ | Recipient's wallet address |
| `mimeType` | string | ✗ | MIME type of the original content |
| `isText` | boolean | ✓ | Whether the content is text (vs. file) |
| `expiry` | string | ✓ | Number of seconds until expiry |
| `maxAttempts` | string | ✓ | Maximum access attempts allowed |
| `contentLength` | number | ✗ | Size in bytes (for files) or characters (for text) |

**Response `200`**

```json
{
  "success": true,
  "link": "https://your-domain.vercel.app/r/0xabc..."
}
```

**Error Responses**

| Status | Condition |
|--------|-----------|
| `400` | Invalid or missing required fields |
| `413` | Content exceeds tier limits (file size or text length) |
| `429` | Daily link creation limit or per-minute rate limit exceeded |
| `500` | Database error |

**Tier Limits Enforced**

| Limit | Free | Pro |
|-------|------|-----|
| Daily links | 5 | 50 |
| Max file size | 30 MB | 1 GB |
| Max text length | 500 chars | Unlimited |
| Rate limit (link creation) | 3/min | 10/min |

---

#### `GET /api/getEncryptedContent/[cid]`

Proxies a request to Pinata to fetch encrypted content by IPFS CID. The content is returned as-is (still encrypted).

**Path Parameters**

| Parameter | Type | Description |
|-----------|------|-------------|
| `cid` | string | IPFS CID of the encrypted content |

**Response `200`**

```json
{
  "encryptedData": "base64encodedciphertext..."
}
```

**Error Responses**

| Status | Condition |
|--------|-----------|
| `400` | CID not provided |
| `500` | Failed to fetch from IPFS |

---

### User

---

#### `GET /api/user/links`

Returns all shared links created by the authenticated user.

**Authentication:** Required

**Response `200`**

```json
{
  "links": [
    {
      "id": "0xabc...",
      "createdAt": "2025-06-01T12:00:00.000Z",
      "expiry": 1750000000,
      "maxAttempts": 3,
      "status": "active",
      "url": "https://your-domain.vercel.app/r/0xabc...",
      "views": 2,
      "lastAccessed": "2025-06-02T10:00:00.000Z"
    }
  ]
}
```

---

#### `POST /api/user/links/revoke`

Revokes an existing shared link, preventing future access.

**Authentication:** Required

**Request Body**

```json
{
  "policyId": "0xabc..."
}
```

**Response `200`**

```json
{
  "success": true
}
```

---

#### `GET /api/user/profile`

Retrieves the authenticated user's display name and profile picture URL.

**Authentication:** Required

**Response `200`**

```json
{
  "displayName": "Alice",
  "pfpUrl": "https://example.com/avatar.png"
}
```

---

#### `POST /api/user/profile`

Updates the authenticated user's display name and profile picture URL.

**Authentication:** Required

**Request Body**

```json
{
  "displayName": "Alice",
  "pfpUrl": "https://example.com/avatar.png"
}
```

**Response `200`**

```json
{
  "success": true
}
```

---

#### `GET /api/user/status`

Returns the authenticated user's tier and subscription status.

**Authentication:** Required

**Response `200`**

```json
{
  "tier": "free",
  "subscriptionExpiresAt": null
}
```

---

#### `GET /api/user/stats`

Returns aggregated statistics for the authenticated user.

**Authentication:** Required

**Response `200`**

```json
{
  "totalLinks": 12,
  "activeLinks": 8,
  "totalViews": 34
}
```

---

#### `POST /api/user/complete-onboarding`

Marks onboarding as complete for the authenticated user.

**Authentication:** Required

**Response `200`**

```json
{
  "success": true
}
```

---

#### `POST /api/user/submit-survey`

Records the user's onboarding survey answers.

**Authentication:** Required

**Request Body**

```json
{
  "primaryUse": "business",
  "howHeard": "twitter"
}
```

**Response `200`**

```json
{
  "success": true
}
```

---

### Access Logs

---

#### `POST /api/access-logs`

Records an access attempt for a policy. Called server-side from other routes; may also be called directly.

**Request Body**

```json
{
  "policyId": "0xabc...",
  "recipientAddress": "0xRecipientAddress",
  "success": true,
  "ipAddress": "1.2.3.4"
}
```

**Response `200`**

```json
{
  "success": true
}
```

---

#### `GET /api/access-logs?policyId=0xabc...`

Returns the full access log and summary statistics for a specific policy.

**Query Parameters**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `policyId` | string | ✓ | Policy ID to retrieve logs for |

**Response `200`**

```json
{
  "logs": [
    {
      "id": 1,
      "policy_id": "0xabc...",
      "recipient_address": "0x...",
      "success": true,
      "ip_address": "1.2.3.4",
      "accessed_at": "2025-06-01T12:00:00.000Z"
    }
  ],
  "stats": {
    "total_views": "5",
    "successful_views": "4",
    "last_accessed": "2025-06-02T10:00:00.000Z"
  }
}
```

---

### Admin

All admin endpoints require the caller's JWT to correspond to a wallet address listed in the admin configuration (`frontend/src/config/admin.ts`).

---

#### `GET /api/admin/users`

Returns a list of all users on the platform.

**Authentication:** Required (Admin only)

---

#### `GET /api/admin/links`

Returns all shared links across all users.

**Authentication:** Required (Admin only)

---

#### `GET /api/admin/status`

Returns platform-wide statistics.

**Authentication:** Required (Admin only)

---

#### `POST /api/admin/upgrade`

Administratively upgrades a user to a specific tier.

**Authentication:** Required (Admin only)

**Request Body**

```json
{
  "walletAddress": "0x...",
  "tier": "pro"
}
```

---

#### `GET /api/admin/granted-users`

Returns a list of users who have been manually granted Pro tier by an admin.

**Authentication:** Required (Admin only)

---

#### `POST /api/admin/manage-admins`

Adds or removes admin privileges for a wallet address.

**Authentication:** Required (Admin only)

---

### Upgrade

---

#### `POST /api/upgrade`

Upgrades the authenticated user to Pro tier after successful payment verification.

**Authentication:** Required

**Response `200`**

```json
{
  "success": true,
  "message": "Successfully upgraded to Pro tier!"
}
```

**Notes**
- Sets the user's tier to `pro` and calculates a subscription expiry 30 days from now.

---

#### `POST /api/upgrade/verify-payment`

Verifies a payment transaction before granting tier upgrade.

**Authentication:** Required

---

### Health

---

#### `GET /api/health`

Returns the health status of the application and database connection.

**Authentication:** None

**Response `200`**

```json
{
  "status": "ok",
  "database": "connected"
}
```

**Response `500`** (database unreachable)

```json
{
  "status": "error",
  "database": "disconnected"
}
```

---

## Rate Limiting

API responses may include the following headers:

| Header | Description |
|--------|-------------|
| `X-RateLimit-Remaining` | Number of requests remaining in the current window |
| `Retry-After` | Seconds until the rate limit resets (only on 429 responses) |

When rate limited, the response body is:

```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "retryAfter": 42
}
```
