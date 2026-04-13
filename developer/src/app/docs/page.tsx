'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, Terminal, Lock, Zap, FileText, Code, ChevronRight, Copy, Check } from 'lucide-react';

const SECTIONS = [
  { id: 'introduction', title: 'Introduction', icon: Shield },
  { id: 'authentication', title: 'Authentication', icon: Lock },
  { id: 'quickstart', title: 'Quick Start', icon: Zap },
  { id: 'endpoints', title: 'API Endpoints', icon: Code },
  { id: 'cli', title: 'CLI Reference', icon: Terminal },
  { id: 'errors', title: 'Error Codes', icon: FileText },
];

const ENDPOINTS = [
  {
    method: 'POST',
    path: '/api/v1/policies',
    description: 'Create a new secure content policy',
    auth: 'Bearer token',
    request: `{
  "encryptedContent": "base64-encoded-encrypted-content",
  "recipientAddress": "0x...",
  "expiry": 86400,
  "maxAttempts": 3,
  "mimeType": "application/pdf",
  "isText": false,
  "contentLength": 1048576,
  "decryptionKey": "base64-encoded-decryption-key"
}`,
    response: `{
  "success": true,
  "policyId": "0x...",
  "link": "https://app.shieldhq.xyz/r/0x...#base64-encoded-decryption-key",
  "decryptionKey": "base64-encoded-decryption-key",
  "txHash": "0x...",
  "gasUsed": "123456",
  "gasCostEth": 0.000123,
  "gasCostUsd": 0.31
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/policies',
    description: 'List all policies created by the developer',
    auth: 'Bearer token',
    parameters: [
      { name: 'limit', type: 'integer', default: '20', max: '100' },
      { name: 'offset', type: 'integer', default: '0' },
      { name: 'status', type: 'string', options: 'active, inactive' },
    ],
    response: `{
  "policies": [
    {
      "id": "0x...",
      "cid": "Qm...",
      "recipient": "0x...",
      "status": "active",
      "expiry": 1700000000,
      "link": "https://app.shieldhq.xyz/r/0x...#decryption-key-hash"
    }
  ],
  "pagination": {
    "total": 42,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/account',
    description: 'Get account information and usage statistics',
    auth: 'Bearer token',
    response: `{
  "account": {
    "ownerAddress": "0x...",
    "eoaAddress": "0x...",
    "tier": "pro",
    "createdAt": "2024-01-15T10:30:00Z"
  },
  "balance": {
    "onChainEth": "0.5",
    "eoaAddress": "0x..."
  },
  "usage": {
    "today": {
      "policies": 12,
      "gasSpentEth": 0.001234,
      "gasSpentUsd": 3.09
    },
    "thisMonth": {
      "policies": 145,
      "gasSpentEth": 0.015,
      "gasSpentUsd": 37.50
    }
  },
  "limits": {
    "dailyPolicies": 500,
    "monthlyPolicies": 500,
    "fileSize": 1073741824
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/usage',
    description: 'Get detailed API usage logs',
    auth: 'Bearer token',
    response: `{
  "logs": [
    {
      "endpoint": "POST /api/v1/policies",
      "timestamp": "2024-01-20T14:30:00Z",
      "gasUsed": "123456",
      "gasCostEth": 0.000123,
      "policyId": "0x..."
    }
  ]
}`,
  },
];

const CLI_COMMANDS = [
  { command: 'shield', description: 'Launch the interactive shell' },
  { command: 'shield login', description: 'Authenticate with your SHIELD account' },
  { command: 'shield balance', description: 'Check your wallet balance and usage' },
  { command: 'shield whoami', description: 'Show current account information' },
  { command: 'shield policies list', description: 'List all your policies' },
  { command: 'shield policies get <id>', description: 'Get details of a specific policy' },
  { command: 'shield create <file>', description: 'Create a new policy from a file' },
  { command: 'shield logout', description: 'Sign out and clear credentials' },
];

const ERROR_CODES = [
  { code: 'UNAUTHORIZED', status: 401, description: 'Invalid or missing API key' },
  { code: 'RATE_LIMIT_EXCEEDED', status: 429, description: 'Daily API request limit exceeded' },
  { code: 'POLICY_LIMIT_EXCEEDED', status: 429, description: 'Monthly policy creation limit exceeded' },
  { code: 'INSUFFICIENT_FUNDS', status: 402, description: 'Developer wallet has insufficient ETH for gas' },
  { code: 'CONTENT_TOO_LARGE', status: 413, description: 'Content exceeds tier size limit' },
  { code: 'MISSING_CONTENT', status: 400, description: 'Required content field is missing' },
  { code: 'INVALID_JSON', status: 400, description: 'Request body contains invalid JSON' },
  { code: 'INTERNAL_ERROR', status: 500, description: 'Server error occurred' },
];

const TIERS = [
  { name: 'Free', price: '$0', daily: 10, monthly: 10, fileSize: '30MB' },
  { name: 'Starter', price: '$29/mo', daily: 100, monthly: 100, fileSize: '100MB' },
  { name: 'Pro', price: '$99/mo', daily: 500, monthly: 500, fileSize: '1GB' },
  { name: 'Enterprise', price: '$499/mo', daily: 'Unlimited', monthly: 'Unlimited', fileSize: '5GB' },
];

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState('introduction');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-64 border-r border-white/10 bg-[#0a0a0a] overflow-y-auto">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-2 mb-8">
            <div className="w-8 h-8 bg-[#8A8AFF] rounded flex items-center justify-center">
              <Shield className="w-5 h-5 text-black" />
            </div>
            <span className="font-bold text-lg">SHIELD Docs</span>
          </Link>

          <nav className="space-y-1">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSection === section.id
                      ? 'bg-[#8A8AFF] text-black'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {section.title}
                </button>
              );
            })}
          </nav>

          <div className="mt-8 pt-8 border-t border-white/10">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
              Go to Dashboard
            </Link>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-64 flex-1">
        <div className="max-w-4xl mx-auto px-8 py-12">
          {/* Introduction */}
          <section id="introduction" className="mb-16">
            <h1 className="text-4xl font-bold mb-6">SHIELD Developer Platform</h1>
            <p className="text-xl text-gray-400 mb-8">
              Build secure content sharing into your applications with our developer-friendly API.
              Create encrypted policies, manage access controls, and track usage - all with simple HTTP requests.
            </p>

            <div className="grid grid-cols-3 gap-6 mb-12">
              <div className="p-6 bg-[#111] rounded-lg border border-white/10">
                <Zap className="w-8 h-8 text-[#8A8AFF] mb-4" />
                <h3 className="font-semibold mb-2">Fast Integration</h3>
                <p className="text-sm text-gray-400">Get started in minutes with our REST API and CLI tools.</p>
              </div>
              <div className="p-6 bg-[#111] rounded-lg border border-white/10">
                <Lock className="w-8 h-8 text-[#8A8AFF] mb-4" />
                <h3 className="font-semibold mb-2">End-to-End Encryption</h3>
                <p className="text-sm text-gray-400">All content is encrypted before upload. Only recipients can decrypt.</p>
              </div>
              <div className="p-6 bg-[#111] rounded-lg border border-white/10">
                <FileText className="w-8 h-8 text-[#8A8AFF] mb-4" />
                <h3 className="font-semibold mb-2">Pay Per Use</h3>
                <p className="text-sm text-gray-400">Only pay for gas fees. No platform fees or hidden costs.</p>
              </div>
            </div>

            <h2 className="text-2xl font-semibold mb-4">Pricing Tiers</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4">Tier</th>
                    <th className="text-left py-3 px-4">Price</th>
                    <th className="text-left py-3 px-4">Daily Policies</th>
                    <th className="text-left py-3 px-4">Monthly Policies</th>
                    <th className="text-left py-3 px-4">Max File Size</th>
                  </tr>
                </thead>
                <tbody>
                  {TIERS.map((tier) => (
                    <tr key={tier.name} className="border-b border-white/5">
                      <td className="py-3 px-4 font-medium">{tier.name}</td>
                      <td className="py-3 px-4">{tier.price}</td>
                      <td className="py-3 px-4">{tier.daily}</td>
                      <td className="py-3 px-4">{tier.monthly}</td>
                      <td className="py-3 px-4">{tier.fileSize}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Authentication */}
          <section id="authentication" className="mb-16">
            <h2 className="text-2xl font-semibold mb-4">Authentication</h2>
            <p className="text-gray-400 mb-6">
              All API requests require authentication using your API key. Include your key in the
              <code className="bg-[#111] px-2 py-1 rounded">Authorization</code> header with the
              <code className="bg-[#111] px-2 py-1 rounded">Bearer</code> scheme.
            </p>

            <div className="bg-[#111] rounded-lg p-4 mb-4 border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Example Request Header</span>
                <button
                  onClick={() => copyToClipboard('Authorization: Bearer your_api_key_here', 'auth-header')}
                  className="text-gray-400 hover:text-white"
                >
                  {copiedCode === 'auth-header' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <code className="text-sm text-[#8A8AFF]">
                Authorization: Bearer your_api_key_here
              </code>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
              <p className="text-sm text-amber-400">
                <strong>Security Note:</strong> Keep your API key secure. Never expose it in client-side code or public repositories.
                If you suspect your key has been compromised, revoke it immediately from your dashboard.
              </p>
            </div>
          </section>

          {/* Quick Start */}
          <section id="quickstart" className="mb-16">
            <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>

            <h3 className="text-lg font-medium mb-3">1. Get Your API Key</h3>
            <p className="text-gray-400 mb-4">
              Sign in to the <Link href="/dashboard" className="text-[#8A8AFF] hover:underline">Dashboard</Link> and
              generate an API key. Save this key securely - you won&apos;t be able to see it again.
            </p>

            <h3 className="text-lg font-medium mb-3">2. Install the CLI (Optional)</h3>
            <div className="bg-[#111] rounded-lg p-4 mb-4 border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Install with npm</span>
                <button
                  onClick={() => copyToClipboard('npm install -g @shield/cli', 'install-cli')}
                  className="text-gray-400 hover:text-white"
                >
                  {copiedCode === 'install-cli' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <code className="text-sm">npm install -g @shield/cli</code>
            </div>

            <h3 className="text-lg font-medium mb-3">3. Create Your First Policy</h3>
            <div className="bg-[#111] rounded-lg p-4 mb-4 border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">curl example</span>
                <button
                  onClick={() => copyToClipboard(`curl -X POST https://developer.shieldhq.xyz/api/v1/policies \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "encryptedContent": "base64content...",\n    "recipientAddress": "0x...",\n    "expiry": 86400,\n    "maxAttempts": 3,\n    "decryptionKey": "base64key..."\n  }'`, 'curl-example')}
                  className="text-gray-400 hover:text-white"
                >
                  {copiedCode === 'curl-example' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <pre className="text-sm overflow-x-auto"><code>{`curl -X POST https://developer.shieldhq.xyz/api/v1/policies \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "encryptedContent": "base64content...",\n    "recipientAddress": "0x...",\n    "expiry": 86400,\n    "maxAttempts": 3,\n    "decryptionKey": "base64key..."\n  }'`}</code></pre>
            </div>

            <p className="text-gray-400">
              That&apos;s it! Your policy is created on-chain and the content is encrypted and stored on IPFS.
              Share the returned <code className="bg-[#111] px-1 rounded">link</code> with the recipient. The link includes the decryption key in the URL hash.
            </p>
          </section>

          {/* API Endpoints */}
          <section id="endpoints" className="mb-16">
            <h2 className="text-2xl font-semibold mb-6">API Endpoints</h2>

            {ENDPOINTS.map((endpoint, index) => (
              <div key={index} className="mb-8 border border-white/10 rounded-lg overflow-hidden">
                <div className="bg-[#111] px-4 py-3 flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      endpoint.method === 'GET'
                        ? 'bg-green-500/20 text-green-400'
                        : endpoint.method === 'POST'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-gray-500/20 text-gray-400'
                    }`}
                  >
                    {endpoint.method}
                  </span>
                  <code className="text-sm">{endpoint.path}</code>
                </div>

                <div className="p-4">
                  <p className="text-gray-400 mb-4">{endpoint.description}</p>

                  <div className="mb-4">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">Authentication</span>
                    <p className="text-sm mt-1">{endpoint.auth}</p>
                  </div>

                  {endpoint.parameters && (
                    <div className="mb-4">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Query Parameters</span>
                      <table className="w-full text-sm mt-2">
                        <tbody>
                          {endpoint.parameters.map((param) => (
                            <tr key={param.name} className="border-b border-white/5">
                              <td className="py-2 font-mono text-[#8A8AFF]">{param.name}</td>
                              <td className="py-2 text-gray-400">{param.type}</td>
                              <td className="py-2 text-gray-500">
                                {param.default && `default: ${param.default}`}
                                {param.options && `options: ${param.options}`}
                                {param.max && `max: ${param.max}`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {endpoint.request && (
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-gray-500 uppercase tracking-wider">Request Body</span>
                        <button
                          onClick={() => copyToClipboard(endpoint.request!, `req-${index}`)}
                          className="text-gray-400 hover:text-white"
                        >
                          {copiedCode === `req-${index}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                      <pre className="bg-[#111] rounded p-3 text-xs overflow-x-auto"><code>{endpoint.request}</code></pre>
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-500 uppercase tracking-wider">Response</span>
                      <button
                        onClick={() => copyToClipboard(endpoint.response, `res-${index}`)}
                        className="text-gray-400 hover:text-white"
                      >
                        {copiedCode === `res-${index}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <pre className="bg-[#111] rounded p-3 text-xs overflow-x-auto"><code>{endpoint.response}</code></pre>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* CLI Reference */}
          <section id="cli" className="mb-16">
            <h2 className="text-2xl font-semibold mb-6">CLI Reference</h2>

            <p className="text-gray-400 mb-6">
              The SHIELD CLI provides an interactive way to manage your account and create policies.
              After installation, run <code className="bg-[#111] px-1 rounded">shield</code> to enter interactive mode.
            </p>

            <div className="border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#111] border-b border-white/10">
                    <th className="text-left py-3 px-4 font-medium">Command</th>
                    <th className="text-left py-3 px-4 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {CLI_COMMANDS.map((cmd, index) => (
                    <tr key={index} className="border-b border-white/5 last:border-0">
                      <td className="py-3 px-4">
                        <code className="text-[#8A8AFF]">{cmd.command}</code>
                      </td>
                      <td className="py-3 px-4 text-gray-400">{cmd.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-lg font-medium mt-8 mb-3">Interactive Shell Commands</h3>
            <p className="text-gray-400 mb-4">
              Once in the interactive shell (<code className="bg-[#111] px-1 rounded">shield</code>), you can use these commands:
            </p>

            <div className="bg-[#111] rounded-lg p-4 border border-white/10">
              <pre className="text-sm text-gray-400">{`shield > help              # Show all available commands
shield > balance          # Check wallet balance
shield > whoami           # Show account info
shield > policies         # List all policies
shield > create ./file.pdf # Create policy from file
shield > logout           # Sign out
shield > exit             # Exit shell`}</pre>
            </div>
          </section>

          {/* Error Codes */}
          <section id="errors" className="mb-16">
            <h2 className="text-2xl font-semibold mb-6">Error Codes</h2>

            <p className="text-gray-400 mb-6">
              When an error occurs, the API returns a JSON response with an error code and message.
              Use these codes to handle errors gracefully in your application.
            </p>

            <div className="border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#111] border-b border-white/10">
                    <th className="text-left py-3 px-4 font-medium">Code</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {ERROR_CODES.map((error, index) => (
                    <tr key={index} className="border-b border-white/5 last:border-0">
                      <td className="py-3 px-4 font-mono text-[#8A8AFF]">{error.code}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          error.status >= 500
                            ? 'bg-red-500/20 text-red-400'
                            : error.status === 429
                              ? 'bg-amber-500/20 text-amber-400'
                              : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {error.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-400">{error.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 bg-[#111] rounded-lg p-6 border border-white/10">
              <h3 className="font-semibold mb-4">Rate Limit Headers</h3>
              <p className="text-sm text-gray-400 mb-4">
                All API responses include rate limit information in the headers:
              </p>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><code className="text-[#8A8AFF]">X-RateLimit-Limit</code> - Maximum requests allowed per day</li>
                <li><code className="text-[#8A8AFF]">X-RateLimit-Remaining</code> - Requests remaining in current window</li>
                <li><code className="text-[#8A8AFF]">X-RateLimit-Reset</code> - Unix timestamp when the limit resets</li>
              </ul>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-16 pt-8 border-t border-white/10">
            <p className="text-sm text-gray-500 text-center">
              Need help? Contact us at{' '}
              <a href="mailto:shieldencrypted@gmail.com" className="text-[#8A8AFF] hover:underline">
                shieldencrypted@gmail.com
              </a>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
