'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  eoaAddress: string;
  currentBalance: string;
}

export default function DepositModal({ isOpen, onClose, eoaAddress, currentBalance }: DepositModalProps) {
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState(currentBalance);

  useEffect(() => {
    if (isOpen) {
      // Refresh balance when modal opens
      fetch('/api/deposit')
        .then(res => res.json())
        .then(data => {
          if (data.balance) {
            setBalance(data.balance);
          }
        })
        .catch(console.error);
    }
  }, [isOpen]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const explorerUrl = `https://basescan.org/address/${eoaAddress}`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Deposit Funds</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Balance */}
          <div className="bg-[#111] rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Current Balance</p>
            <p className="text-2xl font-semibold text-white">{parseFloat(balance).toFixed(6)} ETH</p>
          </div>

          {/* QR Code */}
          <div className="flex flex-col items-center">
            <div className="bg-white p-4 rounded-lg">
              <QRCodeSVG
                value={eoaAddress}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-sm text-gray-400 mt-3">Scan to deposit ETH (Base network)</p>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400">Deposit Address</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-sm font-mono text-white truncate">
                {eoaAddress}
              </code>
              <button
                onClick={() => copyToClipboard(eoaAddress)}
                className="bg-[#8A8AFF] text-black p-3 rounded-lg hover:bg-[#7A7AEF] transition-colors"
                title="Copy address"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Important Info */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2">
            <p className="text-sm text-amber-400 font-medium">Important</p>
            <ul className="text-xs text-amber-400/80 space-y-1 list-disc list-inside">
              <li>Only send ETH on the Base network</li>
              <li>Sending other tokens may result in permanent loss</li>
              <li>Minimum deposit: 0.001 ETH (recommended)</li>
              <li>Deposits typically confirm within seconds</li>
            </ul>
          </div>

          {/* View on Explorer */}
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-[#8A8AFF] hover:text-[#7A7AEF] transition-colors"
          >
            View on BaseScan
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
