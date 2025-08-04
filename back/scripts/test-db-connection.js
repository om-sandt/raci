require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testing database connection...');
console.log('Environment variables:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER ? 'Set' : 'Not set');
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? 'Set' : 'Not set');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'Not set');

// Check if DATABASE_URL contains template literals
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('${')) {
  console.log('⚠️ DATABASE_URL contains template literals, will be constructed from individual variables');
}

// Determine SSL configuration
const useSSL = process.env.NODE_ENV === 'production' || 
               process.env.DB_HOST?.includes('rds.amazonaws.com') ||
               process.env.DATABASE_URL?.includes('rds.amazonaws.com');

console.log('🔒 SSL will be:', useSSL ? 'enabled' : 'disabled');

// Test connection
async function testConnection() {
  try {
    let poolConfig;
    
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('${')) {
      console.log('📦 Using DATABASE_URL for connection test');
      poolConfig = {
        connectionString: process.env.DATABASE_URL,
        ssl: useSSL ? { rejectUnauthorized: false } : false
      };
    } else {
      console.log('📦 Using individual DB_* variables for connection test');
      poolConfig = {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: useSSL ? { rejectUnauthorized: false } : false
      };
    }
    
    const pool = new Pool(poolConfig);
    
    console.log('🔄 Attempting to connect...');
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('📅 Current database time:', result.rows[0].current_time);
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    console.error('Code:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 This usually means the database server is not running or not accessible');
    } else if (error.code === 'ENOTFOUND') {
      console.error('💡 This usually means the hostname cannot be resolved');
    } else if (error.message.includes('authentication')) {
      console.error('💡 This usually means incorrect username/password');
    } else if (error.message.includes('database')) {
      console.error('💡 This usually means the database does not exist');
    }
  }
}

testConnection(); 