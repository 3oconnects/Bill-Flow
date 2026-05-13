// backend/db/migrate.js
// Migration runner: executes all scripts in the migrations folder sequentially.
require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const db   = require('./conn');

async function runMigrations() {
  console.log('🚀 BillFlow DB Migration Runner');
  console.log('==============================');

  try {
    // 1. Ensure migrations tracking table exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Get list of already executed migrations
    const executed = await db.query('SELECT name FROM migrations');
    const executedSet = new Set(executed.rows.map(r => r.name));

    // 3. Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Run in order (001, 002, etc.)

    let runCount = 0;

    for (const file of files) {
      if (executedSet.has(file)) {
        continue;
      }

      console.log(`📋 Running migration: ${file}...`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      // Run the entire file content as a single transaction (if BEGIN/COMMIT is inside) 
      // or at least as a single query execution.
      await db.query(sql);

      // Record success
      await db.query('INSERT INTO migrations (name) VALUES ($1)', [file]);
      console.log(`✅ ${file} completed successfully.`);
      runCount++;
    }

    if (runCount === 0) {
      console.log('✨ Database is already up to date.');
    } else {
      console.log(`🎉 Finished running ${runCount} new migration(s).`);
    }

  } catch (err) {
    console.error('❌ Migration failed!');
    console.error('Error Details:');
    console.error(err);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runMigrations();
