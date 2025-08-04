const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// Check if required environment variables are set
const requiredEnvVars = ['DATABASE_URL', 'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const hasDatabaseUrl = process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('${');
const hasIndividualVars = process.env.DB_HOST && process.env.DB_PORT && process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD;

if (!hasDatabaseUrl && !hasIndividualVars) {
  console.error('❌ Database configuration error:');
  console.error('Either DATABASE_URL or all individual DB_* variables must be set');
  console.error('Required variables:', requiredEnvVars.join(', '));
  console.error('Please check your .env file');
  process.exit(1);
}

// Determine if we should use SSL (required for AWS RDS)
const useSSL = process.env.NODE_ENV === 'production' || 
               process.env.DB_HOST?.includes('rds.amazonaws.com') ||
               process.env.DATABASE_URL?.includes('rds.amazonaws.com');

let poolConfig;
let databaseUrl = process.env.DATABASE_URL;

// If DATABASE_URL contains template literals, construct it from individual variables
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('${') && hasIndividualVars) {
  databaseUrl = `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=require`;
  console.log('📦 Constructed DATABASE_URL from individual variables');
}

if (hasDatabaseUrl || (databaseUrl && !databaseUrl.includes('${'))) {
  // Use DATABASE_URL if available and properly formatted
  console.log('📦 Using DATABASE_URL for database connection');
  poolConfig = {
    connectionString: databaseUrl,
    ssl: useSSL ? { rejectUnauthorized: false } : false
  };
} else {
  // Use individual environment variables
  console.log('📦 Using individual DB_* variables for database connection');
  poolConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: useSSL ? { rejectUnauthorized: false } : false
  };
}

console.log(`🔒 SSL ${useSSL ? 'enabled' : 'disabled'} for database connection`);

const pool = new Pool(poolConfig);

// Test the connection
pool.connect()
  .then(() => console.log('✅ Connected to PostgreSQL database'))
  .catch(err => {
    console.error('❌ Database connection error:', err.message);
    console.error('Please check your database configuration and network connectivity');
  });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
