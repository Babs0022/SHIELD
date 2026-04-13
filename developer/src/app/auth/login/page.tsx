'use client';

import { useEffect, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { useRouter } from 'next/navigation';
import styles from './Login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [status, setStatus] = useState<'idle' | 'signing' | 'loading' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if already has session
    const checkSession = async () => {
      try {
        const response = await fetch('/api/session/account');
        if (response.ok || response.status === 404) {
          // 404 means session exists but no API key yet - still redirect to dashboard
          router.push('/dashboard');
        }
      } catch {
        // No session, stay on login
      }
    };
    checkSession();
  }, [router]);

  const handleAuthenticate = async () => {
    if (!address) return;

    setStatus('signing');
    setError(null);

    try {
      const timestamp = Date.now();
      const message = `SHIELD Developer Login\n\nAddress: ${address}\nTimestamp: ${timestamp}\n\nSign this message to authenticate.`;

      console.log('Requesting signature...');
      const signature = await signMessageAsync({ message });
      console.log('Signature received:', signature.slice(0, 20) + '...');

      setStatus('loading');

      const response = await fetch('/api/v1/auth/web', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          signature,
          message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('Authentication successful');
        router.push('/dashboard');
      } else {
        console.error('Auth failed:', data.error);
        setError(data.error || 'Authentication failed');
        setStatus('error');
      }
    } catch (err: any) {
      console.error('Sign error:', err);

      // Handle user rejection
      if (err.code === 4001 || err.message?.includes('rejected') || err.message?.includes('denied')) {
        setError('You rejected the signature request. Please try again.');
      } else {
        setError(err.message || 'Failed to sign message. Please try again.');
      }
      setStatus('error');
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.form}>
        <h1 className={styles.title}>SHIELD Developer</h1>

        <p className={styles.description}>
          Connect your wallet to access the developer dashboard
        </p>

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

            {status === 'signing' && (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Please sign the message in your wallet...</p>
              </div>
            )}

            {status === 'loading' && (
              <div className={styles.loadingState}>
                <div className={styles.spinner}></div>
                <p>Verifying signature...</p>
              </div>
            )}

            {(status === 'idle' || status === 'error') && (
              <button
                onClick={handleAuthenticate}
                className={styles.button}
              >
                Sign In with Wallet
              </button>
            )}
          </div>
        )}

        {error && (
          <div className={styles.error}>
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
