'use client';

import { useState } from 'react';
import { X, AlertTriangle, Key, Copy, Check, RefreshCw } from 'lucide-react';

interface ApiKeyManagerProps {
  isOpen: boolean;
  onClose: () => void;
  apiKeyPrefix: string;
  eoaAddress: string;
  tier: string;
  onRegenerate: () => Promise<void>;
}

export default function ApiKeyManager({
  isOpen,
  onClose,
  apiKeyPrefix,
  eoaAddress,
  tier,
  onRegenerate,
}: ApiKeyManagerProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      await onRegenerate();
      setShowConfirm(false);
      onClose();
    } catch (err) {
      console.error('Failed to regenerate:', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-[#8A8AFF]" />
            <h2 className="text-lg font-semibold text-white">API Key Management</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {showConfirm ? (
            <div className="space-y-4">
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium">Warning: This Cannot Be Undone</p>
                    <p className="text-sm text-red-300/80 mt-1">
                      Regenerating your API key will immediately revoke the old key.
                      Any applications using the old key will stop working.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#111] rounded-lg p-4 space-y-2">
                <p className="text-sm text-gray-400">Current API Key</p>
                <code className="text-sm font-mono text-gray-500">{apiKeyPrefix}••••••••••••••</code>
                <p className="text-xs text-gray-600 mt-1">This key will be permanently revoked</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 bg-white/5 text-white py-3 rounded-lg font-medium hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegenerate}
                  disabled={loading}
                  className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Revoking...
                    </div>
                  ) : (
                    'Confirm Revoke & Regenerate'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Current Key Info */}
              <div className="bg-[#111] rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-gray-400">API Key Prefix</p>
                  <div className="flex items-center gap-2">
                    <code className="text-lg font-mono text-white">{apiKeyPrefix}</code>
                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Active</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-400">API Wallet</p>
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-gray-300">{eoaAddress}</code>
                    <button
                      onClick={() => copyToClipboard(eoaAddress)}
                      className="text-gray-400 hover:text-white"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Tier</p>
                  <span className="inline-block mt-1 px-3 py-1 bg-[#8A8AFF]/20 text-[#8A8AFF] rounded-full text-sm capitalize">{tier}</span>
                </div>
              </div>

              {/* Security Info */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                <p className="text-sm text-amber-400 font-medium mb-2">Security Notice</p>
                <ul className="text-xs text-amber-400/80 space-y-1 list-disc list-inside">
                  <li>Your API key is shown only once when created</li>
                  <li>Store it securely - we cannot retrieve it for you</li>
                  <li>If compromised, regenerate immediately</li>
                  <li>Your private key is encrypted and never leaves your browser</li>
                </ul>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-full bg-red-500/10 border border-red-500/30 text-red-400 py-3 rounded-lg font-medium hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Regenerate API Key
                </button>

                <p className="text-xs text-gray-500 text-center">
                  This will revoke your current key and generate a new one.
                  <br />
                  All applications will need to be updated.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
