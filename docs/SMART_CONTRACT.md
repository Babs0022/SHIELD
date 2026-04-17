# SHIELD — Smart Contract Reference

This document provides a detailed reference for the `Shield` Solidity smart contract deployed on the Base blockchain.

---

## Table of Contents

1. [Overview](#overview)
2. [Deployment](#deployment)
3. [Data Structures](#data-structures)
4. [State Variables](#state-variables)
5. [Events](#events)
6. [Functions](#functions)
7. [Access Control Logic](#access-control-logic)
8. [Contract Interactions](#contract-interactions)
9. [Security Considerations](#security-considerations)
10. [ABI](#abi)

---

## Overview

The `Shield` contract is the trust anchor of the SHIELD platform. It stores immutable access policies that define:

- **Who** can access encrypted content (by wallet address)
- **When** access expires (Unix timestamp)
- **How many times** the content can be accessed (attempt counter)

Because policies live on the blockchain, they are:

- **Transparent**: Anyone can verify the access rules.
- **Immutable**: Policies cannot be retroactively modified by the backend.
- **Trustless**: Access control is enforced by code, not by a centralized server.

---

## Deployment

| Network | Address |
|---------|---------|
| Base Mainnet | Set via `NEXT_PUBLIC_CONTRACT_ADDRESS` env var |
| Base Sepolia (Testnet) | Set via deployment script |

**Deploying to Base Sepolia:**

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network baseSepolia
```

**Deploying to Base Mainnet:**

```bash
cd contracts
npx hardhat run scripts/deploy.ts --network baseMainnet
```

**Verifying on Basescan:**

```bash
npx hardhat verify --network baseMainnet <CONTRACT_ADDRESS>
```

See [Deployment Guide](./DEPLOYMENT.md) for full instructions.

---

## Data Structures

### `AccessPolicy`

```solidity
struct AccessPolicy {
    address sender;       // Wallet address that created the policy
    address recipient;    // Wallet address authorized to access the content
    uint64 expiry;        // Unix timestamp (seconds) when the policy expires
    uint32 maxAttempts;   // Maximum number of times content can be accessed
    uint32 attempts;      // Number of access attempts logged so far
    bool valid;           // Whether the policy is currently valid
}
```

**Field Details:**

| Field | Type | Description |
|-------|------|-------------|
| `sender` | `address` | The `msg.sender` at policy creation time. The content creator's wallet. |
| `recipient` | `address` | The only address allowed to call `logAttempt()`. |
| `expiry` | `uint64` | Stored as seconds since Unix epoch. The policy is invalid if `block.timestamp >= expiry`. |
| `maxAttempts` | `uint32` | Set by the creator. Once `attempts >= maxAttempts`, the policy becomes invalid. |
| `attempts` | `uint32` | Incremented on every successful `logAttempt()` call. |
| `valid` | `bool` | Set to `false` automatically when `attempts >= maxAttempts`. Can also be set by the sender via revocation (if implemented). |

---

## State Variables

```solidity
mapping(bytes32 => AccessPolicy) public policies;
```

Maps a 32-byte `policyId` to its `AccessPolicy`. The `policyId` is generated client-side using `nanoid` (or similar) and converted to `bytes32`.

The mapping is **public**, meaning anyone can call `policies(policyId)` to read policy data directly from an RPC node.

---

## Events

### `PolicyCreated`

Emitted when a new access policy is successfully created.

```solidity
event PolicyCreated(
    bytes32 indexed policyId,
    address indexed sender,
    address indexed recipient,
    uint256 expiry,
    uint256 maxAttempts
);
```

| Parameter | Indexed | Description |
|-----------|---------|-------------|
| `policyId` | ✓ | The unique policy identifier |
| `sender` | ✓ | The wallet address that created the policy |
| `recipient` | ✓ | The authorized recipient wallet address |
| `expiry` | ✗ | Unix timestamp when the policy expires |
| `maxAttempts` | ✗ | Maximum allowed access attempts |

### `VerificationAttempt`

Emitted when an access attempt is logged.

```solidity
event VerificationAttempt(
    bytes32 indexed policyId,
    bool success
);
```

| Parameter | Indexed | Description |
|-----------|---------|-------------|
| `policyId` | ✓ | The policy being accessed |
| `success` | ✗ | Whether the access attempt was successful |

---

## Functions

### `createPolicy`

Creates a new access policy. Can only be called once per `policyId`.

```solidity
function createPolicy(
    bytes32 policyId,
    address recipient,
    uint256 expiry,
    uint256 maxAttempts
) external
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `policyId` | `bytes32` | Unique identifier for this policy |
| `recipient` | `address` | The wallet authorized to access the content |
| `expiry` | `uint256` | Unix timestamp when the policy expires |
| `maxAttempts` | `uint256` | Maximum number of access attempts allowed |

**Behavior:**
- Requires `policies[policyId].sender == address(0)` — reverts if policy already exists.
- Sets `sender` to `msg.sender` (the content creator).
- Initializes `attempts` to `0` and `valid` to `true`.
- Emits `PolicyCreated`.

**Reverts:**
- `"Policy already exists"` — if a policy with this ID already exists.

---

### `logAttempt`

Logs an access attempt against a policy. Only the designated recipient may call this.

```solidity
function logAttempt(
    bytes32 policyId,
    bool success
) external
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `policyId` | `bytes32` | The policy being accessed |
| `success` | `bool` | Whether the access was successful |

**Behavior:**
- Increments `policy.attempts`.
- If `policy.attempts >= policy.maxAttempts`, sets `policy.valid = false`.
- Emits `VerificationAttempt`.

**Reverts:**

| Error | Condition |
|-------|-----------|
| `"Policy does not exist"` | No policy with this ID exists |
| `"Policy is not valid"` | `policy.valid == false` |
| `"Only the recipient can log an attempt"` | `msg.sender != policy.recipient` |
| `"Policy has expired"` | `block.timestamp >= policy.expiry` |
| `"Max attempts reached"` | `policy.attempts >= policy.maxAttempts` |

---

### `isPolicyValid`

Checks whether a policy is currently valid. A view function — no gas cost when called externally.

```solidity
function isPolicyValid(bytes32 policyId) external view returns (bool)
```

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| `policyId` | `bytes32` | The policy to check |

**Returns:**

`true` if all of the following conditions are met:
- `policy.valid == true`
- `block.timestamp < policy.expiry`
- `policy.attempts < policy.maxAttempts`

---

## Access Control Logic

The contract enforces a three-part validity check:

```
Policy is valid iff:
  policy.valid == true
  AND block.timestamp < policy.expiry
  AND policy.attempts < policy.maxAttempts
```

This means:

1. **Expiry**: If the current block timestamp is past `expiry`, the policy is invalid regardless of remaining attempts.
2. **Attempt limit**: Once `maxAttempts` is reached, `valid` is set to `false` and no further `logAttempt()` calls are allowed.
3. **Revocation**: If `valid` is set to `false` by any means, no further access is possible.

---

## Contract Interactions

### From the Frontend (Sender)

When a user creates a share, the frontend calls `createPolicy()` using `wagmi`'s `useWriteContract` hook:

```typescript
import { useWriteContract } from 'wagmi';
import { ShieldABI } from '@/lib/ShieldABI';

const { writeContract } = useWriteContract();

writeContract({
  address: contractAddress,
  abi: ShieldABI,
  functionName: 'createPolicy',
  args: [policyIdBytes32, recipientAddress, expiryTimestamp, maxAttempts],
});
```

### From the Frontend (Recipient)

When a recipient accesses the share, they call `logAttempt()`:

```typescript
writeContract({
  address: contractAddress,
  abi: ShieldABI,
  functionName: 'logAttempt',
  args: [policyIdBytes32, true],
});
```

### From the Backend

The backend reads policy validity via `isPolicyValid()` using `viem`'s `createPublicClient`:

```typescript
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_MAINNET_RPC_URL),
});

const isValid = await publicClient.readContract({
  address: contractAddress,
  abi: ShieldABI,
  functionName: 'isPolicyValid',
  args: [policyId],
});
```

---

## Security Considerations

### Reentrancy
The contract does not transfer ETH and makes no external calls, so reentrancy is not a concern.

### Integer Overflow
Solidity ^0.8.x has built-in overflow/underflow protection. The `uint32` attempt counters and `uint64` timestamps are safe within their expected ranges.

### Policy ID Collisions
Policy IDs are 32-byte values generated client-side. The probability of a collision is negligible for random IDs, and the contract reverts if a duplicate ID is submitted.

### Front-running
A malicious actor could observe a pending `createPolicy()` transaction and attempt to front-run it with the same `policyId`. However, this would only benefit the attacker if they also knew the IPFS CID and decryption key embedded in the share link — which is generated separately and never exposed on-chain.

### Recipient Impersonation
Only `msg.sender == policy.recipient` can call `logAttempt()`. This prevents unauthorized parties from consuming access attempts.

---

## ABI

The full ABI is available at:
- `frontend/src/lib/Shield.json`
- `frontend/src/lib/ShieldABI.ts` (as a TypeScript constant)
- `contracts/artifacts/contracts/Shield.sol/Shield.json` (Hardhat artifact)

**Key ABI entries:**

```json
[
  {
    "type": "function",
    "name": "createPolicy",
    "inputs": [
      { "name": "policyId", "type": "bytes32" },
      { "name": "recipient", "type": "address" },
      { "name": "expiry", "type": "uint256" },
      { "name": "maxAttempts", "type": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "logAttempt",
    "inputs": [
      { "name": "policyId", "type": "bytes32" },
      { "name": "success", "type": "bool" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "isPolicyValid",
    "inputs": [
      { "name": "policyId", "type": "bytes32" }
    ],
    "outputs": [
      { "name": "", "type": "bool" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "PolicyCreated",
    "inputs": [
      { "name": "policyId", "type": "bytes32", "indexed": true },
      { "name": "sender", "type": "address", "indexed": true },
      { "name": "recipient", "type": "address", "indexed": true },
      { "name": "expiry", "type": "uint256", "indexed": false },
      { "name": "maxAttempts", "type": "uint256", "indexed": false }
    ]
  },
  {
    "type": "event",
    "name": "VerificationAttempt",
    "inputs": [
      { "name": "policyId", "type": "bytes32", "indexed": true },
      { "name": "success", "type": "bool", "indexed": false }
    ]
  }
]
```
