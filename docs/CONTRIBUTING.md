# SHIELD — Contributing Guide

Thank you for your interest in contributing to SHIELD! This document explains how to contribute effectively, from setting up your development environment to submitting pull requests.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [How to Contribute](#how-to-contribute)
3. [Development Setup](#development-setup)
4. [Project Structure](#project-structure)
5. [Coding Standards](#coding-standards)
6. [Commit Guidelines](#commit-guidelines)
7. [Submitting a Pull Request](#submitting-a-pull-request)
8. [Reporting Bugs](#reporting-bugs)
9. [Requesting Features](#requesting-features)
10. [Security Vulnerabilities](#security-vulnerabilities)

---

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please be respectful and constructive in all interactions.

---

## How to Contribute

There are many ways to contribute to SHIELD:

- 🐛 **Report bugs** — open a GitHub issue with a detailed description
- ✨ **Suggest features** — open a feature request issue
- 🔧 **Fix bugs** — pick an open issue and submit a pull request
- 📖 **Improve documentation** — fix typos, add examples, improve clarity
- 🔒 **Security research** — report vulnerabilities responsibly (see [Security Vulnerabilities](#security-vulnerabilities))
- 🧪 **Write tests** — improve test coverage for the frontend and contracts

---

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- Git

### Step 1: Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/SHIELD.git
cd SHIELD
```

3. Add the upstream remote:

```bash
git remote add upstream https://github.com/babs0022/SHIELD.git
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
# Edit frontend/.env with your local values
```

See [Deployment Guide — Environment Variables](./DEPLOYMENT.md#environment-variables) for the full list of required variables.

### Step 4: Start Development

```bash
# Start the frontend dev server
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
SHIELD/
├── contracts/               # Solidity smart contracts
│   ├── contracts/
│   │   └── Shield.sol       # Main access control contract
│   ├── scripts/
│   │   └── deploy.ts        # Deployment script
│   ├── test/                # Contract tests
│   └── hardhat.config.ts    # Hardhat configuration
│
├── frontend/                # Next.js 16 application
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   │   ├── api/         # API route handlers
│   │   │   ├── admin/       # Admin dashboard
│   │   │   ├── profile/     # User profile
│   │   │   ├── r/[policyId] # Share recipient page
│   │   │   └── ...          # Other pages
│   │   ├── components/      # React components
│   │   ├── config/          # App configuration
│   │   ├── contexts/        # React contexts
│   │   └── lib/             # Utilities (DB, rate limiting, ABI)
│   └── public/              # Static assets
│
├── docs/                    # Project documentation
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── SMART_CONTRACT.md
│   ├── DATABASE.md
│   ├── DEPLOYMENT.md
│   ├── SECURITY.md
│   └── CONTRIBUTING.md
│
└── README.md                # Project overview
```

---

## Coding Standards

### TypeScript (Frontend)

- **Strict mode**: The project uses TypeScript with strict type checking.
- **No `any`**: Avoid `any` types. Use proper types or `unknown`.
- **Functional components**: Use React functional components with hooks.
- **Named exports**: Prefer named exports over default exports for components.
- **File naming**: Components use PascalCase (`MyComponent.tsx`); utilities use camelCase (`myUtil.ts`).

### Solidity (Contracts)

- **Version**: Target `^0.8.24`.
- **NatSpec comments**: Document all public functions with NatSpec.
- **Gas optimization**: Consider gas costs for frequently-called functions.
- **Security first**: Follow the [Solidity security guidelines](https://docs.soliditylang.org/en/latest/security-considerations.html).

### General

- **No console.log in production code**: Remove debug logs before submitting PRs. Use the `logger` utility for structured logging.
- **Error handling**: Always handle errors explicitly. Don't swallow errors silently.
- **Environment variables**: Never hardcode secrets. Use environment variables.

### Linting

Run the linter before submitting:

```bash
cd frontend
npm run lint
```

Fix any ESLint errors before submitting a PR.

---

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Types:**

| Type | Description |
|------|-------------|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, etc.) |
| `refactor` | Code refactoring (no functional change) |
| `test` | Adding or updating tests |
| `chore` | Build process, dependency updates |
| `security` | Security-related changes |

**Examples:**

```
feat(frontend): add file size validation on upload

fix(api): handle missing JWT_SECRET gracefully

docs: add deployment guide

security(contracts): add reentrancy guard to logAttempt
```

---

## Submitting a Pull Request

1. **Create a branch** from the latest `main`:

```bash
git checkout main
git pull upstream main
git checkout -b feature/my-new-feature
```

2. **Make your changes** following the coding standards above.

3. **Run the linter**:

```bash
cd frontend && npm run lint
```

4. **Run contract tests** (if modifying contracts):

```bash
cd contracts && npx hardhat test
```

5. **Commit** your changes with a descriptive commit message.

6. **Push** your branch:

```bash
git push origin feature/my-new-feature
```

7. **Open a Pull Request** on GitHub targeting the `main` branch.

### PR Checklist

Before submitting, confirm:

- [ ] My code follows the project's coding standards
- [ ] I have run `npm run lint` and fixed any errors
- [ ] I have tested my changes locally
- [ ] I have updated relevant documentation
- [ ] My commit messages follow the Conventional Commits format
- [ ] I have not committed any secrets or private keys

### PR Description

Include in your PR description:

- **What** the change does
- **Why** it is needed
- **How** it was tested
- Any **breaking changes**
- Screenshots for UI changes

---

## Reporting Bugs

Open a GitHub issue with the following information:

1. **Description**: Clear description of the bug
2. **Steps to reproduce**: Numbered steps to reliably reproduce the issue
3. **Expected behavior**: What you expected to happen
4. **Actual behavior**: What actually happened
5. **Environment**:
   - Browser and version
   - Operating system
   - Wallet (e.g., MetaMask, Coinbase Wallet)
   - Network (Base Mainnet / Base Sepolia)
6. **Screenshots or logs**: If applicable

---

## Requesting Features

Open a GitHub issue with:

1. **Problem statement**: What problem does this feature solve?
2. **Proposed solution**: How do you envision the feature working?
3. **Alternatives considered**: What other approaches did you consider?
4. **Additional context**: Mockups, examples from other projects, etc.

---

## Security Vulnerabilities

**Do not open public GitHub issues for security vulnerabilities.**

Please report security issues responsibly by contacting the maintainer directly. See [Security — Responsible Disclosure](./SECURITY.md#responsible-disclosure) for details.
