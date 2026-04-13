'use client';

import { useState, useEffect } from 'react';
import { Play, Copy, Check, AlertCircle, Send, Key, Eye, EyeOff } from 'lucide-react';

interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  duration: number;
}

interface ApiKeyInfo {
  key: string;
  eoaAddress: string;
  balance: string;
  tier: string;
}

export default function ApiTester() {
  const [endpoint, setEndpoint] = useState('POST /api/v1/policies');
  const [endpointParam, setEndpointParam] = useState('');
  const [requestBody, setRequestBody] = useState(`{
  "encryptedContent": "base64-encoded-content...",
  "recipientAddress": "0x5F196c82968Cd097C352fB6d72cFc50fb3106745",
  "expiry": 86400,
  "maxAttempts": 3,
  "mimeType": "application/pdf",
  "isText": false,
  "contentLength": 1048576,
  "decryptionKey": "base64-key..."
}`);
  const [customApiKey, setCustomApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [paramValue, setParamValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [fetchingKey, setFetchingKey] = useState(true);

  const endpoints = [
    { method: 'GET', path: '/api/health', name: 'Health Check (No Auth)', noAuth: true },
    { method: 'POST', path: '/api/v1/policies', name: 'Create Policy' },
    { method: 'GET', path: '/api/v1/policies', name: 'List Policies' },
    { method: 'GET', path: '/api/v1/policies/[id]', name: 'Get Policy', hasParam: true, paramName: 'id', paramPlaceholder: 'policy-id-0x...' },
    { method: 'DELETE', path: '/api/v1/policies/[id]', name: 'Revoke Policy', hasParam: true, paramName: 'id', paramPlaceholder: 'policy-id-0x...' },
    { method: 'GET', path: '/api/v1/account', name: 'Get Account' },
  ];

  const currentEndpoint = endpoints.find(ep => `${ep.method} ${ep.path}` === endpoint);

  // Fetch API key on mount
  useEffect(() => {
    async function fetchApiKey() {
      try {
        const res = await fetch('/api/account');
        if (res.ok) {
          const data = await res.json();
          setApiKeyInfo({
            key: data.apiKey,
            eoaAddress: data.eoaAddress,
            balance: data.balance,
            tier: data.tier,
          });
          // Pre-fill the custom API key if available
          if (data.apiKey) {
            setCustomApiKey(data.apiKey);
          }
        }
      } catch (err) {
        console.error('Failed to fetch API key:', err);
      } finally {
        setFetchingKey(false);
      }
    }
    fetchApiKey();
  }, []);

  // Update request body when endpoint changes
  useEffect(() => {
    if (endpoint === 'GET /api/v1/policies') {
      setRequestBody(`{
  // No request body needed for GET
}`);
    } else if (endpoint === 'GET /api/v1/account') {
      setRequestBody(`{
  // No request body needed for GET
}`);
    } else if (endpoint === 'POST /api/v1/policies') {
      setRequestBody(`{
  "encryptedContent": "base64-encoded-encrypted-content...",
  "recipientAddress": "0x5F196c82968Cd097C352fB6d72cFc50fb3106745",
  "expiry": 86400,
  "maxAttempts": 3,
  "mimeType": "application/pdf",
  "isText": false,
  "contentLength": 1048576,
  "decryptionKey": "base64-encryption-key..."
}`);
    }
  }, [endpoint]);

  const handleTest = async () => {
    if (!customApiKey) {
      setError('Please enter your API key');
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    const startTime = performance.now();

    try {
      const [method, path] = endpoint.split(' ');
      let finalPath = path;

      // Replace path parameter if needed
      if (currentEndpoint?.hasParam && paramValue) {
        finalPath = path.replace(`[${currentEndpoint.paramName}]`, paramValue);
      }

      const url = finalPath;

      const options: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${customApiKey}`,
        },
      };

      if (method === 'POST' && requestBody) {
        // Only include body if it's not the placeholder
        if (!requestBody.includes('// No request body')) {
          options.body = requestBody;
        }
      }

      const res = await fetch(url, options);
      const duration = Math.round(performance.now() - startTime);

      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const body = await res.json().catch(() => null);

      setResponse({
        status: res.status,
        statusText: res.statusText,
        headers,
        body,
        duration,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatJson = (obj: unknown) => JSON.stringify(obj, null, 2);

  if (fetchingKey) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8A8AFF]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        {/* Request Panel */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Send className="w-5 h-5 text-[#8A8AFF]" />
            <h3 className="text-lg font-semibold">Request</h3>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 flex items-center gap-1">
              <Key className="w-3 h-3" />
              API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={customApiKey}
                onChange={(e) => setCustomApiKey(e.target.value)}
                placeholder="shield_live_..."
                className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2 pr-20 text-white font-mono text-sm focus:outline-none focus:border-[#8A8AFF]"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              {customApiKey && (
                <button
                  onClick={() => copyToClipboard(customApiKey)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
            </div>
            {apiKeyInfo && (
              <div className="text-xs text-gray-500">
                Connected: {apiKeyInfo.eoaAddress.slice(0, 6)}...{apiKeyInfo.eoaAddress.slice(-4)} • Balance: {parseFloat(apiKeyInfo.balance).toFixed(4)} ETH • Tier: {apiKeyInfo.tier}
              </div>
            )}
          </div>

          {/* Endpoint Selector */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Endpoint</label>
            <select
              value={endpoint}
              onChange={(e) => {
                setEndpoint(e.target.value);
                setParamValue(''); // Clear param when endpoint changes
              }}
              className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#8A8AFF]"
            >
              {endpoints.map((ep) => (
                <option key={`${ep.method}-${ep.path}`} value={`${ep.method} ${ep.path}`}>
                  {ep.method} {ep.path} - {ep.name}
                </option>
              ))}
            </select>
          </div>

          {/* Path Parameter Input */}
          {currentEndpoint?.hasParam && (
            <div className="space-y-2">
              <label className="text-sm text-gray-400">{currentEndpoint.paramName}</label>
              <input
                type="text"
                value={paramValue}
                onChange={(e) => setParamValue(e.target.value)}
                placeholder={currentEndpoint.paramPlaceholder}
                className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#8A8AFF]"
              />
            </div>
          )}

          {/* Request Body */}
          {endpoint.startsWith('POST') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-gray-400">Request Body</label>
                <button
                  onClick={() => copyToClipboard(requestBody)}
                  className="text-gray-400 hover:text-white flex items-center gap-1 text-xs"
                >
                  {copied ? (
                    <><Check className="w-3 h-3" /> Copied</>
                  ) : (
                    <><Copy className="w-3 h-3" /> Copy</>
                  )}
                </button>
              </div>
              <textarea
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                rows={12}
                className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#8A8AFF] resize-none"
                spellCheck={false}
              />
            </div>
          )}

          {/* Test Button */}
          <button
            onClick={handleTest}
            disabled={loading || !customApiKey}
            className="w-full bg-[#8A8AFF] text-black py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-[#7A7AEF] transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                Sending...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Send Request
              </>
            )}
          </button>

          {/* Note */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5" />
              <div className="text-sm text-amber-400">
                <p>Make sure you have:</p>
                <ul className="list-disc list-inside mt-1 text-xs">
                  <li>Funded your wallet with ETH for gas</li>
                  <li>A valid API key (shown once when created)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Response Panel */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Play className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold">Response</h3>
          </div>

          {error ? (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5" />
                <div>
                  <p className="font-medium text-red-400">Error</p>
                  <p className="text-sm text-red-300 mt-1">{error}</p>
                </div>
              </div>
            </div>
          ) : response ? (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center gap-4">
                <div
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    response.status < 400
                      ? 'bg-green-500/20 text-green-400'
                      : response.status === 429
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {response.status} {response.statusText}
                </div>
                <div className="text-sm text-gray-400">{response.duration}ms</div>
              </div>

              {/* Headers */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Headers</label>
                <div className="bg-[#111] border border-white/10 rounded-lg p-3">
                  <pre className="text-xs text-gray-400 overflow-x-auto">
                    {Object.entries(response.headers)
                      .filter(([key]) => key.toLowerCase().includes('ratelimit'))
                      .map(([key, value]) => `${key}: ${value}`)
                      .join('\n') || 'No rate limit headers'}
                  </pre>
                </div>
              </div>

              {/* Body */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">Body</label>
                  <button
                    onClick={() => copyToClipboard(formatJson(response.body))}
                    className="text-gray-400 hover:text-white flex items-center gap-1 text-xs"
                  >
                    {copied ? (
                      <><Check className="w-3 h-3" /> Copied</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copy</>
                    )}
                  </button>
                </div>
                <div className="bg-[#111] border border-white/10 rounded-lg p-3 max-h-96 overflow-auto">
                  <pre className="text-sm text-gray-300 overflow-x-auto">
                    {formatJson(response.body)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#111] border border-white/10 rounded-lg p-8 text-center">
              <p className="text-gray-500">Click &quot;Send Request&quot; to see the response</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
