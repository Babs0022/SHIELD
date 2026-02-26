import React from 'react';
import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Shield',
  description: 'The rules and guidelines for using our secure sharing platform.',
};

export default function TermsPage() {
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
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Terms of Service</h1>
            <p className="text-zinc-400">Last updated: February 26, 2026</p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 md:p-12 space-y-10">
            <section>
              <h2 className="text-xl font-semibold text-white mb-4">1. Acceptance of Terms</h2>
              <p className="text-zinc-400 leading-relaxed">
                By accessing or using Shield (&quot;the Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not use the Service. These Terms constitute a legally binding agreement between you and Shield.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">2. Description of Service</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                Shield is a decentralized platform that enables secure file and message sharing through end-to-end encryption and blockchain-based access control. Our service allows you to:
              </p>
              <ul className="list-disc list-inside text-zinc-400 space-y-2 ml-4">
                <li>Encrypt and share files with specific recipients</li>
                <li>Send encrypted messages</li>
                <li>Set access controls including expiration dates and view limits</li>
                <li>Verify access through blockchain technology</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">3. Account and Wallet Requirements</h2>
              <p className="text-zinc-400 leading-relaxed">
                To use Shield, you must connect a compatible blockchain wallet. You are solely responsible for:
              </p>
              <ul className="list-disc list-inside text-zinc-400 space-y-2 ml-4 mt-4">
                <li>Maintaining the security of your wallet and private keys</li>
                <li>All activities that occur under your wallet address</li>
                <li>Any transaction fees associated with blockchain operations</li>
                <li>Ensuring your wallet connection is legitimate and secure</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">4. User Responsibilities</h2>
              <p className="text-zinc-400 leading-relaxed">
                You agree not to use the Service to:
              </p>
              <ul className="list-disc list-inside text-zinc-400 space-y-2 ml-4 mt-4">
                <li>Share illegal content or content that violates applicable laws</li>
                <li>Distribute malware, viruses, or harmful code</li>
                <li>Infringe on intellectual property rights of others</li>
                <li>Harass, threaten, or harm others</li>
                <li>Attempt to compromise the security of the Service</li>
                <li>Use the Service for any fraudulent or deceptive purposes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">5. Content and Encryption</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                Shield employs client-side encryption, which means:
              </p>
              <ul className="list-disc list-inside text-zinc-400 space-y-2 ml-4">
                <li><strong className="text-zinc-300">We cannot access your content:</strong> Your files and messages are encrypted before leaving your device</li>
                <li><strong className="text-zinc-300">You control access:</strong> Only recipients you authorize can decrypt your content</li>
                <li><strong className="text-zinc-300">Permanent deletion:</strong> Once you revoke access or content expires, it cannot be recovered</li>
              </ul>
              <p className="text-zinc-400 leading-relaxed mt-4">
                You retain all rights to content you share through the Service. By sharing content, you grant recipients the right to access that content according to the permissions you set.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">6. Risks and Disclaimers</h2>
              <p className="text-zinc-400 leading-relaxed mb-4">
                By using Shield, you acknowledge and accept the following risks:
              </p>
              <ul className="list-disc list-inside text-zinc-400 space-y-2 ml-4">
                <li><strong className="text-zinc-300">Blockchain Risks:</strong> Blockchain transactions are irreversible. Lost private keys cannot be recovered.</li>
                <li><strong className="text-zinc-300">Technology Risks:</strong> Decentralized technologies are experimental and may have vulnerabilities.</li>
                <li><strong className="text-zinc-300">Regulatory Risks:</strong> Cryptocurrency and blockchain regulations vary by jurisdiction and may change.</li>
                <li><strong className="text-zinc-300">Recipient Responsibility:</strong> You are responsible for ensuring you share content only with intended recipients.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">7. Limitation of Liability</h2>
              <p className="text-zinc-400 leading-relaxed">
                To the maximum extent permitted by law, Shield shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or goodwill, arising from your use of the Service. This includes but is not limited to:
              </p>
              <ul className="list-disc list-inside text-zinc-400 space-y-2 ml-4 mt-4">
                <li>Loss of encrypted content due to lost keys or passwords</li>
                <li>Unauthorized access due to recipient negligence</li>
                <li>Blockchain network issues or congestion</li>
                <li>Wallet provider issues or security breaches</li>
                <li>Force majeure events beyond our control</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">8. Indemnification</h2>
              <p className="text-zinc-400 leading-relaxed">
                You agree to indemnify and hold harmless Shield, its affiliates, and their respective officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses arising from your use of the Service or violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">9. Termination</h2>
              <p className="text-zinc-400 leading-relaxed">
                We reserve the right to suspend or terminate your access to the Service at any time for violation of these Terms or for any other reason at our sole discretion. Upon termination, all provisions that by their nature should survive termination shall survive.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">10. Governing Law</h2>
              <p className="text-zinc-400 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Shield operates, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved through arbitration or in the competent courts of that jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">11. Changes to Terms</h2>
              <p className="text-zinc-400 leading-relaxed">
                We may modify these Terms at any time. We will notify users of significant changes. Continued use of the Service after changes constitutes acceptance of the updated Terms. It is your responsibility to review these Terms periodically.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-4">12. Contact Information</h2>
              <p className="text-zinc-400 leading-relaxed">
                If you have questions about these Terms, please contact us at:
              </p>
              <p className="text-zinc-300 mt-4">
                Email: <a href="mailto:shieldencrypted@gmail.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">shieldencrypted@gmail.com</a>
              </p>
            </section>
          </div>

          <div className="mt-12 text-center">
            <Link href="/privacy" className="text-zinc-400 hover:text-white transition-colors text-sm">
              View Privacy Policy →
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
