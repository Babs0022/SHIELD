'use client';

import { useEffect, useState } from 'react';
import styles from './Dashboard.module.css';
import LogsMonitor from './dashboard/LogsMonitor';
import ApiTester from './dashboard/ApiTester';
import WebhookManager from './dashboard/WebhookManager';
import DepositModal from './dashboard/DepositModal';
import WithdrawModal from './dashboard/WithdrawModal';
import ApiKeyManager from './dashboard/ApiKeyManager';
import TransactionHistory from './dashboard/TransactionHistory';

interface DashboardData {
  account: {
    ownerAddress: string;
    eoaAddress: string;
    tier: string;
    isValidEoa?: boolean;
  };
  balance: {
    onChainEth: string;
    trackedEth: number;
    eoaAddress: string;
  };
  limits: {
    tier: string;
    dailyPolicies: number;
    monthlyPolicies: number;
  };
  usage: {
    today: {
      policies: number;
      gasSpentEth: number;
      gasSpentUsd: number;
    };
    thisMonth: {
      policies: number;
      gasSpentEth: number;
      gasSpentUsd: number;
    };
  };
}

interface ApiKeyInfo {
  prefix: string;
  eoaAddress: string;
  tier: string;
  createdAt: string;
  lastUsedAt: string | null;
  isValidEoa?: boolean;
}

interface GeneratedCredentials {
  apiKey: string;
  eoaAddress: string;
  eoaPrivateKey: string;
}

interface DashboardClientProps {
  address: string;
  cliAuth?: boolean;
}

export default function DashboardClient({ address, cliAuth }: DashboardClientProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [apiKeyInfo, setApiKeyInfo] = useState<ApiKeyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [credentials, setCredentials] = useState<GeneratedCredentials | null>(null);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showApiKeyManager, setShowApiKeyManager] = useState(false);
  const [showTransactionHistory, setShowTransactionHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'logs', label: 'Logs & Monitoring' },
    { id: 'api-tester', label: 'API Tester' },
    { id: 'webhooks', label: 'Webhooks' },
  ];

  useEffect(() => {
    fetchAccountData();
    fetchApiKeyInfo();
  }, []);

  const fetchAccountData = async () => {
    try {
      const response = await fetch('/api/session/account');
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please log in again.');
        }
        // 404 means no API key yet, that's okay
        if (response.status !== 404) {
          throw new Error('Failed to fetch account data');
        }
      }
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const fetchApiKeyInfo = async () => {
    try {
      const response = await fetch('/api/session/apikey');
      if (response.ok) {
        const result = await response.json();
        setApiKeyInfo(result.apiKey);
      } else if (response.status === 404) {
        // No API key yet
        setApiKeyInfo(null);
      }
    } catch (err) {
      console.error('Failed to fetch API key info:', err);
    }
  };

  const handleGenerateApiKey = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/session/apikey/generate', {
        method: 'POST',
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate API key');
      }

      setCredentials({
        apiKey: result.apiKey,
        eoaAddress: result.eoaAddress,
        eoaPrivateKey: result.eoaPrivateKey,
      });
      setShowCredentialsModal(true);
      // Refresh API key info
      fetchApiKeyInfo();
      fetchAccountData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate API key');
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerateApiKey = async () => {
    setGenerating(true);
    try {
      const response = await fetch('/api/account/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to regenerate API key');
      }

      setCredentials({
        apiKey: result.apiKey,
        eoaAddress: result.eoaAddress,
        eoaPrivateKey: result.eoaPrivateKey,
      });
      setShowCredentialsModal(true);
      setShowApiKeyManager(false);
      // Refresh API key info
      fetchApiKeyInfo();
      fetchAccountData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate API key');
    } finally {
      setGenerating(false);
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/session/logout', {
        method: 'POST',
      });
      if (response.ok) {
        window.location.href = '/auth/login';
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadCredentials = () => {
    if (!credentials) return;
    const content = `SHIELD Developer API Credentials
Generated: ${new Date().toISOString()}

API Key: ${credentials.apiKey}
EOA Address: ${credentials.eoaAddress}
EOA Private Key: ${credentials.eoaPrivateKey}

IMPORTANT: Store these securely. The API key and private key will not be shown again.
`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shield-credentials-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Credentials Modal */}
      {showCredentialsModal && credentials && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>🔐 Save Your Credentials</h2>
              <p className={styles.modalSubtitle}>
                This is the only time these will be shown. Download or copy them now.
              </p>
            </div>

            <div className={styles.credentialsSection}>
              <div className={styles.credentialRow}>
                <span className={styles.credentialLabel}>API Key</span>
                <div className={styles.credentialValue}>
                  <code className={styles.credentialCode}>{credentials.apiKey}</code>
                  <button
                    onClick={() => copyToClipboard(credentials.apiKey)}
                    className={styles.copyButton}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className={styles.credentialRow}>
                <span className={styles.credentialLabel}>API Wallet Address</span>
                <div className={styles.credentialValue}>
                  <code className={styles.credentialCode}>{credentials.eoaAddress}</code>
                  <button
                    onClick={() => copyToClipboard(credentials.eoaAddress)}
                    className={styles.copyButton}
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className={styles.credentialRow}>
                <span className={styles.credentialLabel}>Private Key</span>
                <div className={styles.credentialValue}>
                  <code className={styles.credentialCode}>{credentials.eoaPrivateKey}</code>
                  <button
                    onClick={() => copyToClipboard(credentials.eoaPrivateKey)}
                    className={styles.copyButton}
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button onClick={downloadCredentials} className={styles.primaryButton}>
                📥 Download Credentials
              </button>
              <button
                onClick={() => setShowCredentialsModal(false)}
                className={styles.secondaryButton}
              >
                I&apos;ve Saved Them
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.logo}>SHIELD Developer</div>
          <div className={styles.userInfo}>
            <a href="/docs" className={styles.docsLink}>
              Documentation
            </a>
            <span className={styles.walletAddress}>
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            {apiKeyInfo && <span className={styles.tierBadge}>{apiKeyInfo.tier}</span>}
            <button onClick={handleLogout} className={styles.logoutButton}>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Invalid EOA Address Warning */}
      {data?.account?.isValidEoa === false && (
        <div className={styles.errorBanner}>
          <div className={styles.errorBannerContent}>
            <span className={styles.errorBannerIcon}>⚠️</span>
            <div className={styles.errorBannerText}>
              <strong>Invalid API Key Configuration</strong>
              <p>Your API key has a corrupted address. Please regenerate it immediately.</p>
            </div>
            <button
              onClick={() => setShowApiKeyManager(true)}
              className={styles.errorBannerButton}
            >
              Fix Now
            </button>
          </div>
        </div>
      )}

      {/* CLI Auth Banner */}
      {cliAuth && !apiKeyInfo && (
        <div className={styles.cliBanner}>
          <div className={styles.cliBannerContent}>
            <span className={styles.cliBannerIcon}>🖥️</span>
            <div className={styles.cliBannerText}>
              <strong>Complete CLI Authentication</strong>
              <p>Generate an API key below to connect your CLI session.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className={styles.main}>
        {/* Tabs */}
        {apiKeyInfo && (
          <div className={styles.tabs}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'logs' && apiKeyInfo ? (
          <LogsMonitor />
        ) : activeTab === 'api-tester' && apiKeyInfo ? (
          <ApiTester />
        ) : activeTab === 'webhooks' && apiKeyInfo ? (
          <WebhookManager />
        ) : (
          <>
        {/* API Key Card */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>API Key</h2>
          {apiKeyInfo ? (
            <div className={styles.apiKeySection}>
              <div className={styles.apiKeyRow}>
                <span className={styles.apiKeyLabel}>Key</span>
                <div className={styles.apiKeyValue}>
                  <code className={styles.apiKeyCode}>
                    {showApiKey ? `${apiKeyInfo.prefix}...` : `${apiKeyInfo.prefix}••••••••••••••••`}
                  </code>
                  <button
                    onClick={() => setShowApiKey(!showApiKey)}
                    className={styles.iconButton}
                    title={showApiKey ? 'Hide' : 'Show'}
                  >
                    {showApiKey ? '👁️' : '🙈'}
                  </button>
                </div>
              </div>
              <div className={styles.apiKeyRow}>
                <span className={styles.apiKeyLabel}>API Wallet</span>
                <div className={styles.apiKeyValue}>
                  <code className={styles.apiKeyCode}>{apiKeyInfo.eoaAddress}</code>
                  <button
                    onClick={() => copyToClipboard(apiKeyInfo.eoaAddress)}
                    className={styles.iconButton}
                  >
                    📋
                  </button>
                </div>
              </div>
              <div className={styles.apiKeyRow}>
                <span className={styles.apiKeyLabel}>Created</span>
                <span className={styles.apiKeyValue}>
                  {new Date(apiKeyInfo.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div className={styles.apiKeyRow}>
                <span className={styles.apiKeyLabel}>Last Used</span>
                <span className={styles.apiKeyValue}>
                  {apiKeyInfo.lastUsedAt
                    ? new Date(apiKeyInfo.lastUsedAt).toLocaleDateString()
                    : 'Never'}
                </span>
              </div>
              <div className={styles.apiKeyRow} style={{ marginTop: '1rem' }}>
                <button
                  onClick={() => setShowApiKeyManager(true)}
                  className={styles.secondaryButton}
                >
                  Manage API Key
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.noApiKeySection}>
              <p className={styles.noData}>No API key generated yet.</p>
              <p className={styles.noDataSub}>
                Generate an API key to start creating policies programmatically.
              </p>
              <button
                onClick={handleGenerateApiKey}
                disabled={generating}
                className={styles.primaryButton}
              >
                {generating ? 'Generating...' : 'Generate API Key'}
              </button>
            </div>
          )}
        </div>

        {data && (
          <>
            {/* Balance Card */}
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>API Wallet Balance</h2>
              <div className={styles.grid}>
                <div className={styles.statCard}>
                  <p className={styles.statLabel}>On-Chain Balance</p>
                  <p className={styles.statValue}>{parseFloat(data.balance.onChainEth).toFixed(4)} ETH</p>
                </div>
                <div className={styles.statCard}>
                  <p className={styles.statLabel}>API Wallet Address</p>
                  <p className={styles.statValueMono}>
                    {data.balance.eoaAddress}
                    <button
                      onClick={() => copyToClipboard(data.balance.eoaAddress)}
                      className={styles.copyButton}
                      title="Copy address"
                    >
                      📋
                    </button>
                  </p>
                </div>
                <div className={styles.statCard}>
                  <p className={styles.statLabel}>Tier</p>
                  <p className={styles.statValue}>{apiKeyInfo?.tier || 'free'}</p>
                </div>
              </div>
              <div className={styles.actions}>
                <button
                  onClick={() => setShowDepositModal(true)}
                  className={styles.primaryButton}
                >
                  Add Funds
                </button>
                <button
                  onClick={() => setShowWithdrawModal(true)}
                  className={styles.secondaryButton}
                >
                  Withdraw
                </button>
                <button
                  onClick={() => setShowTransactionHistory(true)}
                  className={styles.secondaryButton}
                >
                  Transaction History
                </button>
              </div>
            </div>

            {/* Usage Stats */}
            <div className={styles.usageGrid}>
              <div className={styles.usageCard}>
                <h3 className={styles.usageTitle}>Today&apos;s Usage</h3>
                <div className={styles.usageRow}>
                  <span className={styles.usageLabel}>Policies Created</span>
                  <span className={styles.usageValue}>{data.usage.today.policies}</span>
                </div>
                <div className={styles.usageRow}>
                  <span className={styles.usageLabel}>Gas Spent</span>
                  <span className={styles.usageValue}>{data.usage.today.gasSpentEth.toFixed(6)} ETH</span>
                </div>
                <div className={styles.usageRow}>
                  <span className={styles.usageLabel}>Cost (USD)</span>
                  <span className={styles.usageValue}>${data.usage.today.gasSpentUsd.toFixed(2)}</span>
                </div>
              </div>

              <div className={styles.usageCard}>
                <h3 className={styles.usageTitle}>This Month</h3>
                <div className={styles.usageRow}>
                  <span className={styles.usageLabel}>Policies Created</span>
                  <span className={styles.usageValue}>{data.usage.thisMonth.policies}</span>
                </div>
                <div className={styles.usageRow}>
                  <span className={styles.usageLabel}>Gas Spent</span>
                  <span className={styles.usageValue}>{data.usage.thisMonth.gasSpentEth.toFixed(6)} ETH</span>
                </div>
                <div className={styles.usageRow}>
                  <span className={styles.usageLabel}>Cost (USD)</span>
                  <span className={styles.usageValue}>${data.usage.thisMonth.gasSpentUsd.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Limits */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Your Limits</h3>
              <div className={styles.limitsRow}>
                <div className={styles.limitItem}>
                  <p className={styles.limitLabel}>Daily Policies</p>
                  <p className={styles.limitValue}>
                    {data.usage.today.policies} / {data.limits.dailyPolicies === Infinity ? '∞' : data.limits.dailyPolicies}
                  </p>
                </div>
                <div className={styles.limitItem}>
                  <p className={styles.limitLabel}>Monthly Policies</p>
                  <p className={styles.limitValue}>
                    {data.usage.thisMonth.policies} / {data.limits.monthlyPolicies === Infinity ? '∞' : data.limits.monthlyPolicies}
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </>
        )}
      </main>

      {/* Modals */}
      {data && (
        <>
          <DepositModal
            isOpen={showDepositModal}
            onClose={() => setShowDepositModal(false)}
            eoaAddress={data.balance.eoaAddress}
            currentBalance={data.balance.onChainEth}
          />
          <WithdrawModal
            isOpen={showWithdrawModal}
            onClose={() => setShowWithdrawModal(false)}
            eoaAddress={data.balance.eoaAddress}
            currentBalance={data.balance.onChainEth}
            onSuccess={() => {
              fetchAccountData();
            }}
          />
          <TransactionHistory
            isOpen={showTransactionHistory}
            onClose={() => setShowTransactionHistory(false)}
          />
        </>
      )}

      {/* API Key Manager Modal */}
      {apiKeyInfo && (
        <ApiKeyManager
          isOpen={showApiKeyManager}
          onClose={() => setShowApiKeyManager(false)}
          apiKeyPrefix={apiKeyInfo.prefix}
          eoaAddress={apiKeyInfo.eoaAddress}
          tier={apiKeyInfo.tier}
          onRegenerate={handleRegenerateApiKey}
        />
      )}
    </div>
  );
}
