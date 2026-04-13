'use client';

import { useState } from 'react';
import { X, AlertCircle, ExternalLink } from 'lucide-react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  eoaAddress: string;
  currentBalance: string;
  onSuccess?: () => void;
}

export default function WithdrawModal({ isOpen, onClose, eoaAddress, currentBalance, onSuccess }: WithdrawModalProps) {
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ txHash: string } | null>(null);

  const balance = parseFloat(currentBalance);
  const amountValue = parseFloat(amount) || 0;
  const hasEnough = amountValue <= balance && amountValue > 0;

  const handleMax = () => {
    // Leave some for gas (0.001 ETH)
    const maxAmount = Math.max(0, balance - 0.001);
    setAmount(maxAmount.toFixed(6));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!toAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError('Invalid Ethereum address');
      return;
    }

    if (amountValue <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (amountValue > balance) {
      setError('Insufficient balance');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toAddress, amount: amountValue }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Withdrawal failed');
      }

      setSuccess({ txHash: data.txHash });
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Withdrawal failed');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setToAddress('');
    setAmount('');
    setError(null);
    setSuccess(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">Withdraw Funds</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {success ? (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                <p className="text-green-400 font-medium">✓ Withdrawal Initiated</p>
                <p className="text-sm text-gray-400 mt-2">Your withdrawal has been submitted and is being processed.</p>
              </div>
              <div className="bg-[#111] rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Transaction Hash</p>
                <code className="text-xs font-mono text-white break-all">{success.txHash}</code>
              </div>
              <a
                href={`https://basescan.org/tx/${success.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-sm text-[#8A8AFF] hover:text-[#7A7AEF] transition-colors"
              >
                View on BaseScan
                <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={handleClose}
                className="w-full bg-[#8A8AFF] text-black py-3 rounded-lg font-medium hover:bg-[#7A7AEF] transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Current Balance */}
              <div className="bg-[#111] rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Available Balance</p>
                <p className="text-2xl font-semibold text-white">{balance.toFixed(6)} ETH</p>
              </div>

              {/* To Address */}
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Withdraw To</label>
                <input
                  type="text"
                  value={toAddress}
                  onChange={(e) => setToAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#8A8AFF] placeholder-gray-600"
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-400">Amount (ETH)</label>
                  <button
                    type="button"
                    onClick={handleMax}
                    className="text-xs text-[#8A8AFF] hover:text-[#7A7AEF] transition-colors"
                  >
                    MAX
                  </button>
                </div>
                <input
                  type="number"
                  step="0.000001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-[#8A8AFF] placeholder-gray-600"
                />
                {amountValue > 0 && !hasEnough && (
                  <p className="text-xs text-red-400">Insufficient balance (need {amountValue.toFixed(6)} ETH)</p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Info */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 space-y-2">
                <p className="text-sm text-amber-400 font-medium">Important</p>
                <ul className="text-xs text-amber-400/80 space-y-1 list-disc list-inside">
                  <li>Withdrawals are processed on-chain and cannot be reversed</li>
                  <li>A small amount of ETH is reserved for gas fees</li>
                  <li>Double-check the destination address before confirming</li>
                </ul>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !hasEnough || !toAddress}
                className="w-full bg-[#8A8AFF] text-black py-3 rounded-lg font-medium hover:bg-[#7A7AEF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black" />
                    Processing...
                  </div>
                ) : (
                  'Withdraw'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
