# SHIELD

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.24-363636)](https://soliditylang.org/)
[![Base](https://img.shields.io/badge/Base-Blockchain-0052FF)](https://base.org/)

> **Decentralized, end-to-end encrypted file and message sharing for the web3 era.**

SHIELD is a decentralized application (dApp) that enables secure sharing of confidential content—files and messages—with anyone who owns a web3 wallet. Built on the principles of trustless security, SHIELD ensures your content is only ever decrypted by your intended recipient.

---

## Features

- **End-to-End Encryption** — Content is encrypted in the browser using AES-GCM 256 before ever leaving your device
- **Web3 Native Authentication** — No passwords or email; authenticate with your Ethereum wallet via SIWE
- **On-Chain Access Control** — Smart contract-enforced policies define who can access content, when, and how many times
- **Decentralized Storage** — Encrypted content stored on IPFS via Pinata for censorship-resistant, content-addressed storage
- **Time-Limited Access** — Set expiration dates for your shared content
- **Attempt Limits** — Restrict the number of times content can be accessed
- **Access Logging** — On-chain record of every access attempt for transparency
- **Clean, Modern UI** — Built with Next.js, React, and Tailwind CSS

---

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Sender    │────▶│   Encrypt   │────▶│   Upload    │
│   Browser   │     │   (AES-256) │     │   to IPFS   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Secure    │◀────│   Create    │◀────│  Store CID  │
│    Link     │     │   Policy    │     │   Mapping   │
└─────────────┘     │   (Base)    │     └─────────────┘
                    └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │   Recipient │
                    │   Verifies  │
                    │  (SIWE +    │
                    │   Contract) │
                    └─────────────┘
```

### The Flow

1. **Client-Side Encryption** — When a user uploads a file or writes a message, the content is encrypted directly in their browser using the Web Crypto API (AES-GCM 256). A unique, single-use secret key is generated for this encryption.

2. **IPFS Upload** — The encrypted content is uploaded to the InterPlanetary File System (IPFS) via Pinata, ensuring decentralized and content-addressed storage.

3. **On-Chain Policy Creation** — The user defines access conditions, including the recipient's wallet address, an expiration time, and a maximum number of access attempts. They then sign a transaction to store these conditions as an `AccessPolicy` in the Shield smart contract on the Base blockchain.

4. **Secure Link Generation** — A unique link is generated containing the IPFS CID and the secret key (in the URL fragment, like `#secretKey`). This link is never stored on the server and is only shown to the creator once.

5. **Recipient Verification** — When the recipient opens the link, they must prove ownership of their wallet by signing a message (SIWE). The backend verifies this signature and checks the validity of the on-chain `AccessPolicy`.

6. **On-Chain Access Logging** — After successful verification, the recipient signs a transaction to call the `logAttempt` function on the smart contract, creating an immutable on-chain record of the access.

7. **Client-Side Decryption** — Once the transaction is confirmed, the frontend uses the secret key from the URL fragment to download the encrypted content from IPFS and decrypt it in the browser.

---

## Trust Model

SHIELD's security is centered around a **trustless, end-to-end encrypted** model.

- **Confidentiality is Trustless** — Your content is always encrypted and decrypted on the client-side. The secret key is never sent to the server or stored anywhere other than in the secure link itself. Only someone with the link can decrypt the content, and the backend operator cannot view it.

- **On-Chain Access Control** — The rules for who can access your content and under what conditions are enforced by the Shield smart contract on the blockchain, providing transparency and decentralized enforcement.

- **Non-Sensitive Metadata Storage** — For performance and user experience, a centralized backend stores a mapping between a policy ID and its corresponding IPFS CID. This metadata is non-sensitive and does not compromise the confidentiality of the encrypted content.

This hybrid architecture allows SHIELD to provide a user-friendly experience without compromising on the core promise of trustless, end-to-end encrypted file sharing.

---

## Technology Stack

### Frontend
- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + CSS Modules
- **State Management:** React Query + Wagmi
- **Wallet Integration:** RainbowKit + WalletConnect
- **Authentication:** SIWE (Sign-In with Ethereum)

### Smart Contracts
- **Language:** Solidity ^0.8.24
- **Framework:** Hardhat
- **Network:** Base (Ethereum L2)
- **Testing:** Hardhat Network + TypeChain

### Backend Services
- **Database:** PostgreSQL (via Neon)
- **Storage:** IPFS via Pinata
- **Rate Limiting:** Custom implementation with sliding window
- **Analytics:** Vercel Analytics

### Cryptography
- **Encryption:** AES-GCM 256 (Web Crypto API)
- **Key Generation:** Crypto.getRandomValues
- **Hashing:** SHA-256

---

## Project Structure

```
SHIELD/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   │   ├── api/         # API routes
│   │   │   ├── access/      # Access content page
│   │   │   ├── admin/       # Admin dashboard
│   │   │   ├── docs/        # Documentation
│   │   │   ├── profile/     # User profile
│   │   │   └── upgrade/     # Plan upgrades
│   │   ├── components/      # React components
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom React hooks
│   │   └── lib/             # Utility functions
│   └── public/              # Static assets
│
├── contracts/               # Smart contracts
│   ├── contracts/           # Solidity source files
│   │   └── Shield.sol       # Main access control contract
│   ├── test/                # Contract tests
│   └── scripts/             # Deployment scripts
│
└── public/                  # Static site assets
```

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A wallet with Base Sepolia/Base Mainnet ETH for testing
- Pinata account (for IPFS)
- PostgreSQL database (local or Neon)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Babs0022/SHIELD.git
cd SHIELD
```

2. Install root dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd frontend
npm install
cd ..
```

4. Install contract dependencies:
```bash
cd contracts
npm install
cd ..
```

### Environment Setup

Create a `.env` file in the `frontend/` directory:

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# IPFS (Pinata)
PINATA_JWT=your_pinata_jwt
PINATA_GATEWAY_URL=https://your-gateway.mypinata.cloud

# Blockchain
ALCHEMY_API_KEY=your_alchemy_key
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id

# Contract Addresses
NEXT_PUBLIC_SHIELD_CONTRACT_BASE=0x...
NEXT_PUBLIC_SHIELD_CONTRACT_BASE_SEPOLIA=0x...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
SESSION_SECRET=your_session_secret
```

### Running Locally

1. Start the frontend development server:
```bash
cd frontend
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Deploying Contracts

1. Configure Hardhat network in `contracts/hardhat.config.ts`

2. Deploy to testnet:
```bash
cd contracts
npx hardhat run scripts/deploy.ts --network baseSepolia
```

3. Deploy to mainnet:
```bash
npx hardhat run scripts/deploy.ts --network baseMainnet
```

---

## Smart Contract

The `Shield` contract on Base blockchain manages access policies:

```solidity
struct AccessPolicy {
    address sender;      // Creator of the policy
    address recipient;   // Authorized recipient
    uint64 expiry;       // Expiration timestamp
    uint32 maxAttempts;  // Maximum access attempts
    uint32 attempts;     // Current attempt count
    bool valid;          // Policy validity flag
}
```

### Key Functions

- `createPolicy()` — Create a new access policy
- `logAttempt()` — Log an access attempt (requires recipient signature)
- `isPolicyValid()` — Check if a policy is currently valid

---

## Security Considerations

- **Secret keys** are stored in URL fragments (`#key`) which are never sent to servers
- **Encrypted content** is stored on IPFS without any identifying metadata
- **Access control** is enforced by immutable smart contracts
- **No server** ever has access to unencrypted content or decryption keys
- **Rate limiting** prevents abuse of the API endpoints

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

---

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Smart contracts powered by [Hardhat](https://hardhat.org/)
- Deployed on [Base](https://base.org/)
- IPFS pinning via [Pinata](https://pinata.cloud/)

---

<p align="center">
  <sub>Built with 🔒 by Babsbuild.eth</sub>
</p>
