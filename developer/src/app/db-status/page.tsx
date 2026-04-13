import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

async function testConnection() {
  try {
    const start = Date.now();
    const [result] = await sql`SELECT 1 as connected, current_database() as db, version() as ver`;
    const latency = Date.now() - start;

    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'developer'
      ORDER BY table_name
    `;

    return {
      success: true,
      latency: `${latency}ms`,
      database: result.db,
      version: result.ver?.split(' ')[0] || 'unknown',
      tables: tables.map((t: any) => t.table_name),
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
  }
}

export default async function DbStatusPage() {
  const status = await testConnection();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Database Connection Status</h1>

        {status.success ? (
          <div className="space-y-6">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <span className="text-xl font-semibold text-green-400">Connected to Neon</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#111] border border-white/10 rounded-lg p-4">
                <p className="text-sm text-gray-400">Database</p>
                <p className="text-lg font-mono">{status.database}</p>
              </div>
              <div className="bg-[#111] border border-white/10 rounded-lg p-4">
                <p className="text-sm text-gray-400">Latency</p>
                <p className="text-lg font-mono">{status.latency}</p>
              </div>
              <div className="bg-[#111] border border-white/10 rounded-lg p-4">
                <p className="text-sm text-gray-400">Version</p>
                <p className="text-lg font-mono">{status.version}</p>
              </div>
              <div className="bg-[#111] border border-white/10 rounded-lg p-4">
                <p className="text-sm text-gray-400">Timestamp</p>
                <p className="text-lg font-mono">{status.timestamp}</p>
              </div>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Developer Schema Tables ({status.tables?.length || 0})</p>
              <div className="flex flex-wrap gap-2">
                {status.tables?.map((table: string) => (
                  <span
                    key={table}
                    className="px-3 py-1 bg-[#8A8AFF]/20 text-[#8A8AFF] rounded-full text-sm"
                  >
                    {table}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">❌</span>
              <span className="text-xl font-semibold text-red-400">Connection Failed</span>
            </div>
            <div className="bg-red-900/20 rounded p-4 font-mono text-sm text-red-300">
              {status.error}
            </div>

            <div className="mt-6 space-y-2 text-sm text-gray-400">
              <p><strong>Troubleshooting:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Check POSTGRES_URL is set in .env.local</li>
                <li>Verify the database is active (not paused) in Neon console</li>
                <li>Try waiting 10 seconds and refresh (Neon free tier cold start)</li>
                <li>Check your network connection</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
