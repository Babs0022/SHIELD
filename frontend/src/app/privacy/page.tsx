import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Shield',
  description: 'How we protect your data and maintain your privacy.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black">
      {/* Navigation */}
      <nav className="border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tighter text-white hover:text-zinc-300 transition-colors flex items-center gap-2">
            <span className="text-indigo-400">⚡</span> Shield
          </Link>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Back Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Privacy Policy</h1>
            <p className="text-zinc-400">Last updated: February 26, 2026</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 space-y-10">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Our Commitment to Privacy</h2>
              <p className="text-zinc-400 leading-relaxed">
                At Shield, privacy is not just a feature—it is the foundation of our entire platform. We have designed our service with a Zero-Knowledge architecture, which means that by design, we cannot access your data, files, or messages. This Privacy Policy explains how we handle the minimal information we do collect and how we protect your privacy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Information We Do NOT Collect</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                Due to our Zero-Knowledge architecture, we cannot and do not collect:
              </p>
              <ul className="list-disc list-inside text-zinc-400 space-y-2 ml-4">
                <li>Your files or file contents</li>
                <li>Your messages or message contents</li>
                <li>Your encryption keys (generated client-side in your browser)</li>
                <li>Your passwords (we use secure authentication methods)</li>
                <li>Your browsing history within the app</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Information We Collect</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                We collect only the minimal information necessary to provide our service:
              </p>
              <ul className="list-disc list-inside text-zinc-400 space-y-2 ml-4">
                <li><strong className="text-zinc-300">Wallet Address:</strong> Your blockchain wallet address for authentication and access control</li>
                <li><strong className="text-zinc-300">Policy Metadata:</strong> Basic information about sharing policies (recipient addresses, expiration dates, access limits) without the actual content</li>
                <li><strong className="text-zinc-300">Transaction Data:</strong> On-chain transaction hashes for transparency and auditability</li>
                <li><strong className="text-zinc-300">Usage Analytics:</strong> Anonymous, aggregated usage data to improve our service (no personal data)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">How We Use Your Information</h2>
              <p className="text-zinc-400 leading-relaxed">
                The limited information we collect is used solely to:
              </p>
              <ul className="list-disc list-inside text-zinc-400 space-y-2 ml-4 mt-4">
                <li>Authenticate your access to the platform</li>
                <li>Enforce access controls you configure (expiration dates, view limits)</li>
                <li>Provide customer support when you contact us</li>
                <li>Improve our service through anonymous analytics</li>
                <li>Comply with legal obligations when required</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Data Security</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 mb-2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <p className="text-zinc-300 text-sm font-medium">End-to-End Encryption</p>
                  <p className="text-zinc-500 text-xs mt-1">All files and messages are encrypted before leaving your device</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 mb-2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                  </svg>
                  <p className="text-zinc-300 text-sm font-medium">Client-Side Keys</p>
                  <p className="text-zinc-500 text-xs mt-1">Your encryption keys are generated in your browser and never transmitted to our servers</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 mb-2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                  <p className="text-zinc-300 text-sm font-medium">Decentralized Storage</p>
                  <p className="text-zinc-500 text-xs mt-1">Encrypted data is stored on IPFS, a distributed network</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 mb-2">
                    <path d="M2 12h20"></path>
                    <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-6"></path>
                    <path d="M12 2v20"></path>
                  </svg>
                  <p className="text-zinc-300 text-sm font-medium">Blockchain Verification</p>
                  <p className="text-zinc-500 text-xs mt-1">Access permissions are recorded on-chain for transparency</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Your Rights</h2>
              <p className="text-zinc-400 leading-relaxed">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-zinc-400 space-y-2 ml-4 mt-4">
                <li>Access any personal data we hold about you</li>
                <li>Request deletion of your account and associated metadata</li>
                <li>Revoke access to shared content at any time</li>
                <li>Export your policy data</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Third-Party Services</h2>
              <p className="text-zinc-400 leading-relaxed">
                We use the following third-party services:
              </p>
              <ul className="list-disc list-inside text-zinc-400 space-y-2 ml-4 mt-4">
                <li><strong className="text-zinc-300">IPFS:</strong> Decentralized storage for encrypted data (content is encrypted before upload)</li>
                <li><strong className="text-zinc-300">Blockchain Networks:</strong> For access control and transaction recording</li>
                <li><strong className="text-zinc-300">Wallet Providers:</strong> For secure authentication (MetaMask, WalletConnect, etc.)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Changes to This Policy</h2>
              <p className="text-zinc-400 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify users of significant changes via our platform or email. Continued use of Shield after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">Contact Us</h2>
              <p className="text-zinc-400 leading-relaxed">
                If you have questions about this Privacy Policy or our privacy practices, please contact us at:
              </p>
              <p className="text-zinc-300 mt-4">
                Email: <a href="mailto:shieldencrypted@gmail.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">shieldencrypted@gmail.com</a>
              </p>
            </section>
          </div>

          <div className="mt-12 text-center">
            <Link href="/tos" className="text-zinc-400 hover:text-white transition-colors text-sm">
              View Terms of Service →
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-zinc-600 text-sm">© 2026 Shield. Secure by design.</p>
        </div>
      </footer>
    </div>
  );
}
