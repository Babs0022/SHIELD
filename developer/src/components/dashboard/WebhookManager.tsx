'use client';

import { useState, useEffect } from 'react';
import { Webhook, Plus, Trash2, Check, X, RefreshCw, AlertCircle, Copy, Check as CheckIcon } from 'lucide-react';

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  failureCount: number;
  lastSuccessAt?: string;
  createdAt: string;
}

const AVAILABLE_EVENTS = [
  { id: 'policy.created', label: 'Policy Created', description: 'Triggered when a new policy is created' },
  { id: 'policy.accessed', label: 'Policy Accessed', description: 'Triggered when someone accesses a policy' },
  { id: 'policy.expired', label: 'Policy Expired', description: 'Triggered when a policy expires' },
  { id: 'tier.upgraded', label: 'Tier Upgraded', description: 'Triggered when account is upgraded' },
  { id: 'tier.downgraded', label: 'Tier Downgraded', description: 'Triggered when account is downgraded' },
  { id: '*', label: 'All Events', description: 'Receive all webhook events' },
];

export default function WebhookManager() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newWebhook, setNewWebhook] = useState({ url: '', events: [] as string[] });
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const response = await fetch('/api/webhooks');
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.webhooks);
      }
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newWebhook.url || newWebhook.events.length === 0) return;

    try {
      const response = await fetch('/api/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWebhook),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedSecret(data.webhook.secret);
        setNewWebhook({ url: '', events: [] });
        fetchWebhooks();
      }
    } catch (error) {
      console.error('Failed to add webhook:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;

    try {
      const response = await fetch(`/api/webhooks?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchWebhooks();
      }
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    }
  };

  const toggleWebhook = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/webhooks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isActive: !isActive }),
      });

      if (response.ok) {
        fetchWebhooks();
      }
    } catch (error) {
      console.error('Failed to toggle webhook:', error);
    }
  };

  const copySecret = () => {
    if (generatedSecret) {
      navigator.clipboard.writeText(generatedSecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleEvent = (eventId: string) => {
    setNewWebhook((prev) => ({
      ...prev,
      events: prev.events.includes(eventId)
        ? prev.events.filter((e) => e !== eventId)
        : [...prev.events, eventId],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8A8AFF]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Webhook className="w-5 h-5 text-[#8A8AFF]" />
          <h3 className="text-lg font-semibold">Webhooks</h3>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#8A8AFF] text-black px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-[#7A7AEF] transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Webhook
        </button>
      </div>

      {/* Webhooks List */}
      {webhooks.length === 0 ? (
        <div className="bg-[#111] border border-white/10 rounded-lg p-8 text-center">
          <Webhook className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-2">No webhooks configured</p>
          <p className="text-sm text-gray-500">
            Add a webhook to receive real-time notifications
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map((webhook) => (
            <div
              key={webhook.id}
              className="bg-[#111] border border-white/10 rounded-lg p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        webhook.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-500/20 text-gray-400'
                      }`}
                    >
                      {webhook.isActive ? 'Active' : 'Inactive'}
                    </span>
                    {webhook.failureCount > 0 && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-amber-500/20 text-amber-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {webhook.failureCount} failures
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-mono text-gray-300 mb-2">{webhook.url}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>
                      Events: {webhook.events.length === 1 && webhook.events[0] === '*'
                        ? 'All'
                        : webhook.events.length}
                    </span>
                    {webhook.lastSuccessAt && (
                      <span>
                        Last success: {new Date(webhook.lastSuccessAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleWebhook(webhook.id, webhook.isActive)}
                    className={`p-2 rounded-lg transition-colors ${
                      webhook.isActive
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                        : 'bg-gray-500/20 text-gray-400 hover:bg-gray-500/30'
                    }`}
                    title={webhook.isActive ? 'Disable' : 'Enable'}
                  >
                    {webhook.isActive ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(webhook.id)}
                    className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Events */}
              <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-2">
                {webhook.events.map((event) => (
                  <span
                    key={event}
                    className="px-2 py-1 bg-white/5 rounded text-xs text-gray-400"
                  >
                    {event}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Webhook Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-white/10 rounded-xl max-w-lg w-full p-6">
            <h3 className="text-xl font-semibold mb-4">Add Webhook</h3>

            {!generatedSecret ? (
              <>
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Webhook URL</label>
                    <input
                      type="url"
                      value={newWebhook.url}
                      onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                      placeholder="https://your-app.com/webhook"
                      className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#8A8AFF]"
                    />
                    <p className="text-xs text-gray-500 mt-1">Must use HTTPS</p>
                  </div>

                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Events</label>
                    <div className="space-y-2">
                      {AVAILABLE_EVENTS.map((event) => (
                        <label
                          key={event.id}
                          className="flex items-start gap-3 p-3 bg-black rounded-lg cursor-pointer hover:bg-white/5"
                        >
                          <input
                            type="checkbox"
                            checked={newWebhook.events.includes(event.id)}
                            onChange={() => toggleEvent(event.id)}
                            className="mt-1"
                          />
                          <div>
                            <p className="text-sm font-medium">{event.label}</p>
                            <p className="text-xs text-gray-500">{event.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2 border border-white/10 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdd}
                    disabled={!newWebhook.url || newWebhook.events.length === 0}
                    className="flex-1 py-2 bg-[#8A8AFF] text-black rounded-lg font-medium hover:bg-[#7A7AEF] transition-colors disabled:opacity-50"
                  >
                    Add Webhook
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <p className="text-green-400 font-medium mb-2">Webhook created!</p>
                  <p className="text-sm text-gray-400">
                    Save this secret - you won&apos;t be able to see it again.
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Webhook Secret</label>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2 text-sm font-mono break-all">
                      {generatedSecret}
                    </code>
                    <button
                      onClick={copySecret}
                      className="px-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
                    >
                      {copied ? <CheckIcon className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setGeneratedSecret(null);
                  }}
                  className="w-full py-2 bg-[#8A8AFF] text-black rounded-lg font-medium"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
