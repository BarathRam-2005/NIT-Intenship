/**
 * Database Connection Module
 * 
 * We utilize node-postgres (`pg`) connection pooling. A pool maintains a cache of database connections.
 * It is drastically more performant than opening and closing a brand new connection for every single query request.
 */
const { Pool } = require('pg');
require('dotenv').config();

// Initialize the shared connection pool using environment variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,      // The name of your Postgres DB
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,  // 5432 is the Postgres default port
});

// A pool will emit an 'error' event on behalf of its idle clients if the database 
// restarts or network connectivity unexpectedly drops. We log this and cleanly exit.
pool.on('error', (err, client) => {
  console.error('Unexpected fatal error on idle database client', err);
  process.exit(-1);
});

module.exports = {
  // We export a helper query function that automatically checks out a client from the pool,
  // runs the query, and instantly returns the client to the pool.
  query: (text, params) => pool.query(text, params),
  pool
};
