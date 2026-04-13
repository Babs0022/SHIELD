'use client';

import { useState, useEffect } from 'react';
import { X, Copy, Check, AlertCircle, Wallet, ArrowDownLeft } from 'lucide-react';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  eoaAddress: string;
  apiKeyId: string;
}

export default function DepositModal({ isOpen, onClose, eoaAddress, apiKeyId }: DepositModalProps) {
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchBalance();
    }
  }, [isOpen]);

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/account');
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
      }
    } catch (err) {
      console.error('Failed to fetch balance:', err);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(eoaAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateQRCode = () => {
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ethereum:${eoaAddress}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl max-w-md w-full p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#8A8AFF]/20 flex items-center justify-center">
              <ArrowDownLeft className="w-5 h-5 text-[#8A8AFF]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Deposit Funds</h2>
              <p className="text-sm text-gray-400">Send ETH to your API wallet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance */}
        {balance && (
          <div className="bg-white/5 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Current Balance</p>
            <p className="text-2xl font-mono">{parseFloat(balance).toFixed(6)} ETH</p>
          </div>
        )}

        {/* QR Code */}
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-lg">
            <img
              src={generateQRCode()}
              alt="Deposit QR Code"
              className="w-48 h-48"
            />
          </div>
          <p className="text-sm text-gray-400">Scan with your wallet app</p>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <label className="text-sm text-gray-400">Your Deposit Address</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-[#111] border border-white/10 rounded-lg px-4 py-3 font-mono text-sm break-all">
              {eoaAddress}
            </div>
            <button
              onClick={copyAddress}
              className="px-4 py-2 bg-[#8A8AFF] text-black rounded-lg font-medium flex items-center gap-2 hover:bg-[#7A7AEF] transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Networks */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
            <div className="text-sm text-amber-400">
              <p className="font-medium">Important</p>
              <p className="mt-1">Only send ETH on Base Sepolia network. Sending other tokens or using other networks may result in permanent loss.</p>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchBalance}
          disabled={loading}
          className="w-full py-3 border border-white/20 rounded-lg font-medium hover:bg-white/5 transition-colors disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Check Balance'}
        </button>
      </div>
    </div>
  );
}
