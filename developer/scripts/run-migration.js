#!/usr/bin/env node

/**
 * Database Migration Runner
 * Usage: node scripts/run-migration.js
 */

const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Load environment variables
  require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

  if (!process.env.POSTGRES_URL) {
    console.error('❌ Error: POSTGRES_URL environment variable is not set');
    console.error('Please set it in .env.local file');
    process.exit(1);
  }

  // Import neon
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(process.env.POSTGRES_URL);

  const migrationFile = path.join(__dirname, '001_create_developer_tables.sql');

  console.log('🔄 Running database migration...\n');
  console.log(`📄 File: ${migrationFile}`);

  try {
    // Read migration file
    const migrationSQL = fs.readFileSync(migrationFile, 'utf8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    console.log(`📊 Found ${statements.length} statements to execute\n`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      // Skip transaction control statements
      if (statement.toUpperCase() === 'BEGIN' || statement.toUpperCase() === 'COMMIT') {
        continue;
      }

      try {
        await sql`${statement}`;
        console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
      } catch (error) {
        console.error(`❌ Statement ${i + 1} failed:`, error.message);
        console.error('Statement:', statement.substring(0, 100) + '...');
        throw error;
      }
    }

    console.log('\n✅ Migration completed successfully!');

    // Verify tables were created
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'developer'
    `;

    console.log('\n📋 Created tables:');
    for (const table of tables) {
      console.log(`   - developer.${table.table_name}`);
    }

    // Check if policies table was altered
    const columns = await sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'policies'
      AND column_name IN ('created_via_api', 'developer_api_key_id')
    `;

    if (columns.length > 0) {
      console.log('\n📋 Added columns to public.policies:');
      for (const col of columns) {
        console.log(`   - ${col.column_name}`);
      }
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
