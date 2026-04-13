# @shield/cli

Command-line interface for SHIELD Developer Platform.

## Installation

```bash
npm install -g @shield/cli
```

Or use npx:
```bash
npx @shield/cli
```

## Usage

### Authenticate
```bash
shield login
# Opens browser for wallet authentication
```

### Create Policy
```bash
shield policies create ./secret.pdf \
  --recipient 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb \
  --expiry 7d \
  --attempts 5
```

### List Policies
```bash
shield policies list
shield policies list --status active --limit 50
```

### Check Balance
```bash
shield balance
```

### Show Account
```bash
shield whoami
```

## Configuration

Environment variables:
- `SHIELD_API_URL` - API base URL (default: https://developer.shieldhq.xyz/api/v1)
- `SHIELD_DEVELOPER_URL` - Developer dashboard URL

## Development

```bash
npm install
npm run build
npm run dev
```

## License

MIT
