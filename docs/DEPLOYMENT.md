# SHIELD — Deployment Guide

This guide walks through everything needed to deploy the full SHIELD stack: the smart contract, the Next.js frontend, and all required third-party services.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Third-Party Service Setup](#third-party-service-setup)
   - [Neon (PostgreSQL)](#1-neon-postgresql)
   - [Pinata (IPFS)](#2-pinata-ipfs)
   - [Reown / WalletConnect](#3-reown--walletconnect)
   - [Alchemy (RPC)](#4-alchemy-rpc)
4. [Smart Contract Deployment](#smart-contract-deployment)
5. [Frontend Deployment (Vercel)](#frontend-deployment-vercel)
6. [Local Development Setup](#local-development-setup)
7. [Post-Deployment Checklist](#post-deployment-checklist)
8. [Updating the Contract](#updating-the-contract)

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| npm | 9+ | Package manager |
| Git | any | Version control |
| A wallet | — | For deploying contracts and testing |

You will also need accounts with the following services (all have free tiers):

- [Neon](https://neon.tech/) — serverless PostgreSQL
- [Pinata](https://pinata.cloud/) — IPFS pinning
- [Reown / WalletConnect](https://cloud.reown.com/) — wallet connection modal
- [Alchemy](https://www.alchemy.com/) *(optional)* — RPC provider
- [Vercel](https://vercel.com/) — frontend hosting
- [Basescan](https://basescan.org/) — contract verification (optional)

---

## Environment Variables

Create a `.env` file in the `frontend/` directory. **Never commit this file to version control.**

```env
# ─── Database ──────────────────────────────────────────────────────────────────
POSTGRES_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require

# ─── IPFS (Pinata) ─────────────────────────────────────────────────────────────
PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
PINATA_GATEWAY_URL=https://your-gateway.mypinata.cloud

# ─── Blockchain / RPC ──────────────────────────────────────────────────────────
BASE_MAINNET_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
# Or use Alchemy:
# BASE_MAINNET_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
ALCHEMY_API_KEY=your_alchemy_api_key        # optional

# ─── Smart Contract ────────────────────────────────────────────────────────────
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedContractAddress

# ─── Wallet Connection ─────────────────────────────────────────────────────────
NEXT_PUBLIC_WC_PROJECT_ID=your_walletconnect_project_id

# ─── Auth / JWT ────────────────────────────────────────────────────────────────
JWT_SECRET=a-long-random-secret-string-at-least-32-chars

# ─── Application ───────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
# (Leave blank for local dev; defaults to http://localhost:3000)
FRONTEND_URL=https://your-domain.vercel.app

# ─── Contract Deployment (contracts/.env only) ─────────────────────────────────
PRIVATE_KEY=0xYourDeployerWalletPrivateKey
ETHERSCAN_API_KEY=your_basescan_api_key
```

### For Contracts

Create a separate `.env` file in the `contracts/` directory:

```env
PRIVATE_KEY=0xYourDeployerWalletPrivateKey
BASE_MAINNET_RPC_URL=https://mainnet.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
ETHERSCAN_API_KEY=your_basescan_api_key
```

> ⚠️ **Security**: Never commit private keys. The `contracts/.env` file is already in `.gitignore`.

---

## Third-Party Service Setup

### 1. Neon (PostgreSQL)

1. Sign up at [neon.tech](https://neon.tech/)
2. Create a new project
3. Copy the **connection string** from the dashboard
4. Paste it as `POSTGRES_URL` in your `frontend/.env`

The database tables are created automatically on first startup. No manual migration is required.

### 2. Pinata (IPFS)

1. Sign up at [pinata.cloud](https://pinata.cloud/)
2. Go to **API Keys** → **New Key**
3. Enable **pinFileToIPFS** and **pinJSONToIPFS** permissions
4. Copy the **JWT** → paste as `PINATA_JWT`
5. Under **Gateways**, create a dedicated gateway (or use the public one)
6. Paste your gateway URL as `PINATA_GATEWAY_URL`

### 3. Reown / WalletConnect

1. Sign up at [cloud.reown.com](https://cloud.reown.com/)
2. Create a new project (type: **Web3Modal / AppKit**)
3. Add your domain to the allowed origins
4. Copy the **Project ID** → paste as `NEXT_PUBLIC_WC_PROJECT_ID`

### 4. Alchemy (RPC)

Alchemy is optional. You can use the public Base RPC endpoints instead.

1. Sign up at [alchemy.com](https://www.alchemy.com/)
2. Create an app on the **Base** network
3. Copy the **API Key** → paste as `ALCHEMY_API_KEY`
4. Use the full RPC URL in `BASE_MAINNET_RPC_URL`

---

## Smart Contract Deployment

### Step 1: Install Dependencies

```bash
cd contracts
npm install
```

### Step 2: Configure Environment

Create `contracts/.env` with your `PRIVATE_KEY` and RPC URLs (see [Environment Variables](#environment-variables)).

### Step 3: Compile the Contract

```bash
npx hardhat compile
```

This generates TypeChain types and artifacts in `contracts/typechain-types/` and `contracts/artifacts/`.

### Step 4: Deploy to Testnet (Base Sepolia)

```bash
npx hardhat run scripts/deploy.ts --network baseSepolia
```

Note the deployed contract address from the output.

### Step 5: Verify the Contract (Optional)

```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS>
```

### Step 6: Deploy to Mainnet

Once you've tested on Sepolia:

```bash
npx hardhat run scripts/deploy.ts --network baseMainnet
npx hardhat verify --network baseMainnet <CONTRACT_ADDRESS>
```

### Step 7: Update Environment

Set `NEXT_PUBLIC_CONTRACT_ADDRESS` to the deployed mainnet address in your frontend environment.

### Hardhat Networks

The Hardhat configuration in `contracts/hardhat.config.ts` includes:

| Network Name | Chain | RPC |
|-------------|-------|-----|
| `baseSepolia` | Base Sepolia Testnet | `BASE_SEPOLIA_RPC_URL` |
| `baseMainnet` | Base Mainnet | `BASE_MAINNET_RPC_URL` |

---

## Frontend Deployment (Vercel)

SHIELD's frontend is configured for **Vercel** deployment.

### Step 1: Connect Repository

1. Log in to [vercel.com](https://vercel.com/)
2. Click **Add New → Project**
3. Import the `SHIELD` GitHub repository
4. Set the **Root Directory** to `frontend`
5. Framework preset: **Next.js**

### Step 2: Configure Environment Variables

In the Vercel project settings → **Environment Variables**, add all variables from your `frontend/.env` file.

> ⚠️ Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. All others are server-side only.

### Step 3: Deploy

Click **Deploy**. Vercel will:
1. Install dependencies (`npm install`)
2. Build the Next.js app (`npm run build`)
3. Deploy to a global edge network

### Automatic Deployments

Every push to the `main` branch triggers a new production deployment. Pull requests get preview deployments automatically.

### Custom Domain

1. Go to **Settings → Domains** in your Vercel project
2. Add your custom domain
3. Update `NEXT_PUBLIC_APP_URL` and `FRONTEND_URL` to match

---

## Local Development Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/babs0022/SHIELD.git
cd SHIELD
```

### Step 2: Install Dependencies

```bash
# Root dependencies
npm install

# Frontend
cd frontend && npm install && cd ..

# Contracts
cd contracts && npm install && cd ..
```

### Step 3: Set Up Environment

```bash
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your values
```

### Step 4: Run the Development Server

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Step 5: (Optional) Run a Local Hardhat Node

```bash
cd contracts
npx hardhat node         # Start local blockchain
npx hardhat run scripts/deploy.ts --network localhost  # Deploy locally
```

### Available Scripts

**Frontend:**

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run dev` | Start with hot reload |
| Build | `npm run build` | Production build |
| Start | `npm start` | Start production server |
| Lint | `npm run lint` | Run ESLint |

**Contracts:**

| Script | Command | Description |
|--------|---------|-------------|
| Compile | `npx hardhat compile` | Compile Solidity |
| Test | `npx hardhat test` | Run contract tests |
| Coverage | `npx hardhat coverage` | Code coverage report |
| Deploy | `npx hardhat run scripts/deploy.ts --network <name>` | Deploy contract |

---

## Post-Deployment Checklist

After deploying, verify the following:

- [ ] `GET /api/health` returns `{ "status": "ok", "database": "connected" }`
- [ ] Wallet connection works in the browser
- [ ] Sign-in (SIWE) flow completes successfully and returns a JWT
- [ ] Creating a secure share completes (encryption → IPFS upload → on-chain policy → link generated)
- [ ] The recipient link loads and displays the correct recipient address
- [ ] The recipient can sign in and access the decrypted content
- [ ] Admin dashboard is accessible (if admin wallet is configured)
- [ ] Rate limiting is working (check `X-RateLimit-Remaining` response header)
- [ ] Contract is verified on Basescan (optional but recommended)

---

## Updating the Contract

Since the Shield contract does not have an upgrade mechanism (it's intentionally simple and immutable), updates require deploying a new contract:

1. Modify `contracts/contracts/Shield.sol`
2. Deploy the new contract to testnet and verify behaviour
3. Deploy to mainnet
4. Update `NEXT_PUBLIC_CONTRACT_ADDRESS` in Vercel environment variables
5. Redeploy the frontend

> **Note:** Existing policies on the old contract will no longer be accessible once the frontend is pointed to the new contract address. Plan migrations carefully.
