const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function testDesignation() {
  let pool;
  
  try {
    console.log('🧪 Testing designation creation...');
    
    // Create a pool with SSL enabled for remote database
    const poolConfig = {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl: {
        rejectUnauthorized: false
      }
    };
    
    pool = new Pool(poolConfig);
    
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Connected to database');
    
    // Check if company_id column exists
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'designations' 
      AND column_name = 'company_id'
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('❌ company_id column does not exist in designations table');
      return;
    }
    
    console.log('✅ company_id column exists in designations table');
    
    // Test inserting a designation
    const testName = 'Test Designation ' + Date.now();
    const testCompanyId = 2; // Use company ID 2
    
    console.log(`📝 Testing insertion of designation: ${testName} for company: ${testCompanyId}`);
    
    const insertResult = await pool.query(
      'INSERT INTO designations (name, company_id) VALUES ($1, $2) RETURNING designation_id, name, company_id',
      [testName, testCompanyId]
    );
    
    console.log('✅ Designation created successfully!');
    console.log('📊 Created designation:', insertResult.rows[0]);
    
    // Test querying the designation
    const queryResult = await pool.query(
      'SELECT designation_id, name, company_id FROM designations WHERE name = $1',
      [testName]
    );
    
    console.log('✅ Designation retrieved successfully!');
    console.log('📊 Retrieved designation:', queryResult.rows[0]);
    
    // Clean up - delete the test designation
    await pool.query('DELETE FROM designations WHERE name = $1', [testName]);
    console.log('🧹 Test designation cleaned up');
    
    console.log('🎉 All designation tests passed!');
    
  } catch (error) {
    console.error('❌ Error testing designation:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

testDesignation(); 