'use client';

import { useState, useEffect } from 'react';
import { Activity, AlertCircle, CheckCircle, Clock, TrendingUp, Server } from 'lucide-react';

interface LogEntry {
  id: string;
  method: string;
  endpoint: string;
  responseStatus: number;
  responseTimeMs: number;
  errorCode?: string;
  errorMessage?: string;
  rateLimitHit: boolean;
  createdAt: string;
}

interface UsageStats {
  totalRequests: number;
  errorCount: number;
  avgResponseTime: number;
  requestsByEndpoint: Record<string, number>;
}

export default function LogsMonitor() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('day');

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [timeRange]);

  const fetchLogs = async () => {
    try {
      const response = await fetch(`/api/logs?limit=100&period=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/stats?period=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filter === 'errors') return log.responseStatus >= 400;
    if (filter === 'success') return log.responseStatus < 400;
    if (filter === 'rate_limited') return log.rateLimitHit;
    return true;
  });

  const getStatusIcon = (status: number) => {
    if (status < 400) return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === 429) return <AlertCircle className="w-4 h-4 text-amber-400" />;
    return <AlertCircle className="w-4 h-4 text-red-400" />;
  };

  const getStatusColor = (status: number) => {
    if (status < 400) return 'bg-green-500/20 text-green-400';
    if (status === 429) return 'bg-amber-500/20 text-amber-400';
    return 'bg-red-500/20 text-red-400';
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
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[#111] p-4 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-[#8A8AFF]" />
              <span className="text-sm text-gray-400">Total Requests</span>
            </div>
            <div className="text-2xl font-bold">{stats.totalRequests.toLocaleString()}</div>
          </div>

          <div className="bg-[#111] p-4 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-sm text-gray-400">Errors</span>
            </div>
            <div className="text-2xl font-bold">{stats.errorCount.toLocaleString()}</div>
            <div className="text-xs text-gray-500 mt-1">
              {((stats.errorCount / stats.totalRequests) * 100).toFixed(1)}% error rate
            </div>
          </div>

          <div className="bg-[#111] p-4 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[#8A8AFF]" />
              <span className="text-sm text-gray-400">Avg Response</span>
            </div>
            <div className="text-2xl font-bold">{stats.avgResponseTime}ms</div>
          </div>

          <div className="bg-[#111] p-4 rounded-lg border border-white/10">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-sm text-gray-400">Success Rate</span>
            </div>
            <div className="text-2xl font-bold">
              {(((stats.totalRequests - stats.errorCount) / stats.totalRequests) * 100).toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {['all', 'success', 'errors', 'rate_limited'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === f
                  ? 'bg-[#8A8AFF] text-black'
                  : 'bg-[#111] text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {(['day', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                timeRange === range
                  ? 'bg-white text-black'
                  : 'bg-[#111] text-gray-400 hover:text-white border border-white/10'
              }`}
            >
              Last {range}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#111] rounded-lg border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-[#111]">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Status</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Method</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Endpoint</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Time</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Response</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No logs found for the selected filter
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(log.responseStatus)}
                        {log.rateLimitHit && (
                          <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-xs rounded">
                            Rate Limited
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-1 bg-white/10 rounded text-xs">{log.method}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">{log.endpoint}</td>
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(log.responseStatus)}`}>
                          {log.responseStatus}
                        </span>
                        <span className="text-gray-400 text-xs">{log.responseTimeMs}ms</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Endpoint Breakdown */}
      {stats && Object.keys(stats.requestsByEndpoint).length > 0 && (
        <div className="bg-[#111] p-6 rounded-lg border border-white/10">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Server className="w-5 h-5 text-[#8A8AFF]" />
            Requests by Endpoint
          </h3>
          <div className="space-y-3">
            {Object.entries(stats.requestsByEndpoint)
              .sort(([, a], [, b]) => b - a)
              .map(([endpoint, count]) => (
                <div key={endpoint} className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-mono">{endpoint}</span>
                      <span className="text-sm text-gray-400">{count.toLocaleString()} requests</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#8A8AFF] rounded-full"
                        style={{
                          width: `${(count / stats.totalRequests) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
