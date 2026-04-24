require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

async function run() {
    try {
        console.log("Connecting securely to " + process.env.DB_NAME);
        
        // Wipe entirely
        await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
        console.log("Schema public dropped and recreated.");
        
        // Read file exactly
        const sql = fs.readFileSync('./database_schema.sql', 'utf8');
        
        // Run SQL Native natively
        await pool.query(sql);
        console.log("Schema generated flawlessly.");

        // Check tables to verify!
        const r = await pool.query("SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'");
        console.log("Verified Tables in DB:", r.rows.map(x=>x.tablename).join(', '));
        
    } catch(e) {
        console.error("FATAL ERROR GENERATING SCHEMA:", e);
    } finally {
        await pool.end();
    }
}
run();
