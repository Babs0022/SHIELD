'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './not-found.module.css';

export default function NotFound() {
  useEffect(() => {
    document.title = "404 - Page Not Found | Shield";
  }, []);

  return (
    <div className={styles.container}>
      {/* 404 Text with Glitch Effect */}
      <div className={styles.glitchWrapper}>
        <h1 className={styles.glitchText} data-text="404">404</h1>
      </div>

      {/* Shield Logo */}
      <div className={styles.logoWrapper}>
        <Image
          src="/Shld.png"
          alt="Shield"
          width={80}
          height={80}
          className={styles.logo}
          priority
        />
      </div>

      {/* Glass Panel Message */}
      <div className={styles.glassPanel}>
        <h2 className={styles.subtitle}>Page Not Found</h2>
        <p className={styles.message}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <p className={styles.subMessage}>
          It might be encrypted and only accessible by the intended recipient.
        </p>
      </div>

      {/* Action Buttons */}
      <div className={styles.buttonGroup}>
        <Link href="/" className={styles.primaryButton}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={styles.buttonIcon}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
          </svg>
          Go Home
        </Link>
      </div>

      {/* Suggested Links */}
      <div className={styles.suggestedLinks}>
        <p className={styles.suggestedTitle}>You might be looking for:</p>
        <div className={styles.linkGroup}>
          <Link href="https://shieldhq.xyz/token" className={styles.linkPill}>$SHLD Token</Link>
          <Link href="https://shieldhq.xyz/#about" className={styles.linkPill}>About</Link>
          <Link href="https://shieldhq.xyz/#faq" className={styles.linkPill}>FAQ</Link>
          <a href="https://docs.shieldhq.xyz" className={styles.linkPill}>Documentation</a>
        </div>
      </div>

      {/* Footer - Full Landing Page Footer */}
      <footer className="w-full bg-black border-t border-white/5 pt-16 pb-8 mt-auto">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <Link href="https://shieldhq.xyz" className="text-xl font-semibold tracking-tighter text-white block mb-6 flex items-center gap-2">
                <Image src="/Shld.png" alt="Shield Logo" width={20} height={20} /> Shield
              </Link>
              <p className="text-zinc-500 text-xs leading-relaxed max-w-xs">
                The secure decentralized file transfer dApp. Your data, your rules.
              </p>
            </div>

            <div>
              <h4 className="text-white font-medium mb-4 text-xs">Product</h4>
              <ul className="space-y-2 text-xs text-zinc-500">
                <li><Link href="/" className="hover:text-white transition-colors">Launch App</Link></li>
                <li><a href="https://shieldhq.xyz/token" className="hover:text-white transition-colors">$SHLD Token</a></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-medium mb-4 text-xs">Resources</h4>
              <ul className="space-y-2 text-xs text-zinc-500">
                <li><a href="https://dune.com/shieldapp/shieldapp" className="hover:text-white transition-colors">Dune Dashboard</a></li>
                <li><a href="https://docs.shieldhq.xyz" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="https://shieldhq.xyz/#faq" className="hover:text-white transition-colors">FAQ</a></li>
                <li><Link href="https://shieldhq.xyz/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="https://shieldhq.xyz/tos" className="hover:text-white transition-colors">Terms of Service</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-medium mb-4 text-xs">Connect</h4>
              <div className="flex gap-4">
                <a href="https://github.com/shieldhqxyz" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white hover:text-black transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
                  </svg>
                </a>
                <a href="https://x.com/shieldhq_" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white hover:text-black transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path>
                  </svg>
                </a>
                <a href="https://discord.com/invite/S4j9TpHCnW" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-zinc-400 hover:bg-white hover:text-black transition-all">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="12" r="1"></circle>
                    <circle cx="15" cy="12" r="1"></circle>
                    <path d="M7.5 7.2c.3-.1.6-.1.9-.2A17.2 17.2 0 0 1 20.8 7c.3.1.6.1.9.2a2 2 0 0 1 1.5 1.7 10 10 0 0 1-.2 2.5 13 13 0 0 1-.8 2.6 2 2 0 0 1-1.4 1c-.3.1-.6.1-.9.1a15.7 15.7 0 0 1-6.8-2.6 15.7 15.7 0 0 1-6.8 2.6c-.3 0-.6 0-.9-.1a2 2 0 0 1-1.4-1 13 13 0 0 1-.8-2.6 10 10 0 0 1-.2-2.5 2 2 0 0 1 1.5-1.7c.3-.1.6-.2.9-.2A17.2 17.2 0 0 1 7.5 7.2z"></path>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-zinc-600 text-[10px]">2026 Shield. All rights reserved.</p>
            <div className="flex gap-6 text-[10px] text-zinc-600">
              <Link href="https://shieldhq.xyz/privacy" className="hover:text-zinc-400">Privacy Policy</Link>
              <Link href="https://shieldhq.xyz/tos" className="hover:text-zinc-400">Terms of Service</Link>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                App Operational
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
