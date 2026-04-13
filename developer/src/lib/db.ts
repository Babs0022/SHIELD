import { neon, NeonQueryFunction } from '@neondatabase/serverless';

if (!process.env.POSTGRES_URL) {
  throw new Error('Missing POSTGRES_URL environment variable');
}

// Use Neon serverless driver with HTTP API
// Connection pooling is handled by Neon's backend
const sql = neon(process.env.POSTGRES_URL, {
  // Full URL including pooler for connection routing
  fullResults: false,
});

export default sql;
