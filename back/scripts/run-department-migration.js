const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function runDepartmentMigration() {
  let pool;
  
  try {
    console.log('🔧 Adding new fields to departments table...');
    
    // Create a pool with SSL enabled for remote database
    const poolConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    };
    
    pool = new Pool(poolConfig);
    
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Connected to database');
    
    // Read and execute the migration
    const fs = require('fs');
    const path = require('path');
    const migrationPath = path.join(__dirname, '../db/migrate_add_department_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(migrationSQL);
    console.log('✅ Department migration completed successfully!');
    
    // Verify the columns were added
    console.log('🔍 Verifying new columns...');
    
    const columnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'departments' 
      AND column_name IN ('department_size', 'location', 'division', 'function')
      ORDER BY column_name
    `);
    
    console.log('📊 Verification results:');
    const expectedColumns = ['department_size', 'location', 'division', 'function'];
    const existingColumns = columnsCheck.rows.map(row => row.column_name);
    
    expectedColumns.forEach(col => {
      console.log(`- departments.${col}:`, existingColumns.includes(col) ? '✅ EXISTS' : '❌ MISSING');
    });
    
    console.log('🎉 Department fields added successfully!');
    
  } catch (error) {
    console.error('❌ Error running department migration:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

runDepartmentMigration(); 