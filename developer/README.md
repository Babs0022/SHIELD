# SHIELD Developer Platform

Developer API and dashboard for the SHIELD secure content sharing platform.

## Structure

```
developer/
├── src/
│   ├── app/              # Next.js app router
│   │   ├── api/v1/      # API routes
│   │   ├── dashboard/   # Developer dashboard
│   │   ├── auth/cli/    # CLI authentication
│   │   └── layout.tsx   # Root layout
│   ├── components/      # React components
│   ├── lib/            # Utilities
│   └── hooks/          # React hooks
├── scripts/            # Database migrations
└── public/            # Static assets
```

## Setup

1. Install dependencies:
```bash
npm install
```

2. Set environment variables:
```bash
POSTGRES_URL=          # Neon database URL
JWT_SECRET=           # JWT signing secret
ENCRYPTION_KEY=       # 64-char hex for AES encryption
SHIELD_CONTRACT_ADDRESS=  # Shield.sol contract address
BASE_RPC_URL=        # Base network RPC
PINATA_JWT=          # Pinata API JWT
PINATA_GATEWAY=      # Pinata gateway URL
DEVELOPER_URL=       # https://developer.shieldhq.xyz
FRONTEND_URL=        # https://app.shieldhq.xyz
```

3. Run database migration:
```bash
npm run db:migrate
```

4. Start development server:
```bash
npm run dev
```

## Deployment

Deploy to Vercel:
```bash
vercel --prod
```

Set custom domain: `developer.shieldhq.xyz`

## API Endpoints

- `POST /api/v1/auth/cli/initiate` - Start CLI authentication
- `POST /api/v1/auth/cli/verify` - Verify CLI authentication
- `GET /api/v1/auth/cli/status` - Check auth status
- `GET /api/v1/account` - Get account info
- `GET /api/v1/policies` - List policies
- `POST /api/v1/policies` - Create policy

## Features

- API key authentication
- Smart contract wallet per developer
- Self-funded gas model
- Policy creation via API
- Usage tracking and billing
