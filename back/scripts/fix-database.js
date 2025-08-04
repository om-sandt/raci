const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function fixDatabase() {
  let pool;
  
  try {
    console.log('🔧 Fixing database schema...');
    
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
    
    // Add company_id column to designations table
    console.log('📝 Adding company_id to designations table...');
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'designations' 
          AND column_name = 'company_id'
        ) THEN
          ALTER TABLE designations ADD COLUMN company_id INT;
        END IF;
      END $$;
    `);
    console.log('✅ Added company_id to designations');
    
    // Add company_id column to locations table
    console.log('📝 Adding company_id to locations table...');
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'locations' 
          AND column_name = 'company_id'
        ) THEN
          ALTER TABLE locations ADD COLUMN company_id INT;
        END IF;
      END $$;
    `);
    console.log('✅ Added company_id to locations');
    
    // Add company_id column to divisions table
    console.log('📝 Adding company_id to divisions table...');
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (
          SELECT 1 
          FROM information_schema.columns 
          WHERE table_name = 'divisions' 
          AND column_name = 'company_id'
        ) THEN
          ALTER TABLE divisions ADD COLUMN company_id INT;
        END IF;
      END $$;
    `);
    console.log('✅ Added company_id to divisions');
    
    // Verify the columns were added
    console.log('🔍 Verifying columns...');
    
    const designationsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'designations' 
      AND column_name = 'company_id'
    `);
    
    const locationsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'locations' 
      AND column_name = 'company_id'
    `);
    
    const divisionsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'divisions' 
      AND column_name = 'company_id'
    `);
    
    console.log('📊 Verification results:');
    console.log('- designations.company_id:', designationsCheck.rows.length > 0 ? '✅ EXISTS' : '❌ MISSING');
    console.log('- locations.company_id:', locationsCheck.rows.length > 0 ? '✅ EXISTS' : '❌ MISSING');
    console.log('- divisions.company_id:', divisionsCheck.rows.length > 0 ? '✅ EXISTS' : '❌ MISSING');
    
    console.log('🎉 Database schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing database:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

fixDatabase(); 