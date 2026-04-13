'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAccount, useSignMessage } from 'wagmi';
import styles from './CLIAuth.module.css';

export default function CLIAuthContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deviceCode = searchParams.get('code');
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState<'idle' | 'signing' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!deviceCode) {
      setError('No device code provided');
      setStatus('error');
    }
  }, [deviceCode]);

  const handleAuthenticate = async () => {
    if (!address || !deviceCode) return;

    setStatus('signing');

    try {
      const message = `SHIELD Developer CLI Authentication\n\nDevice Code: ${deviceCode}\nTimestamp: ${Date.now()}\nNetwork: Base\n\nSign this message to authenticate your CLI.`;

      const signature = await signMessageAsync({ message });

      const response = await fetch('/api/v1/auth/cli/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceCode,
          address,
          signature,
          message,
        }),
      });

      const data = await response.json();

      if (data.success && data.status === 'needs_api_key') {
        setRedirecting(true);
        setError(null);
        router.push('/dashboard?cliAuth=true');
      } else if (data.success) {
        setStatus('success');
      } else {
        setError(data.error || 'Authentication failed');
        setStatus('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setStatus('error');
    }
  };

  if (redirecting) {
    return (
      <main className={styles.container}>
        <div className={styles.form}>
          <div className={styles.spinner}></div>
          <p className={styles.description}>Redirecting to dashboard...</p>
        </div>
      </main>
    );
  }

  if (status === 'success') {
    return (
      <main className={styles.container}>
        <div className={styles.form}>
          <div className={styles.successIcon}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className={styles.title}>CLI Authenticated!</h1>
          <p className={styles.description}>
            Your CLI is now connected. You can close this window and return to your terminal.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <div className={styles.form}>
        <h1 className={styles.title}>Authenticate CLI</h1>
        <p className={styles.description}>Connect your wallet to enable CLI access</p>

        {deviceCode && (
          <div className={styles.deviceCodeBox}>
            <p className={styles.deviceCodeLabel}>Device Code</p>
            <p className={styles.deviceCodeValue}>{deviceCode}</p>
          </div>
        )}

        {!isConnected ? (
          <div className={styles.connectSection}>
            <appkit-button />
          </div>
        ) : (
          <div className={styles.connectedSection}>
            <div className={styles.walletInfo}>
              <span className={styles.walletLabel}>Connected Wallet</span>
              <span className={styles.walletAddress}>
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>

            {status === 'signing' ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Please sign the message in your wallet...</p>
              </div>
            ) : (
              <button
                onClick={handleAuthenticate}
                disabled={status === 'error'}
                className={styles.button}
              >
                Sign Authentication Message
              </button>
            )}
          </div>
        )}

        {error && (
          <div className={styles.error}>{error}</div>
        )}
      </div>
    </main>
  );
}
