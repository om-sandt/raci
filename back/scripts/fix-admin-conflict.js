const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function fixAdminConflict() {
  let pool;
  
  try {
    console.log('🔧 Fixing admin ID conflict...');
    
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
    
    // Check the conflicting website admin
    const conflictingAdminResult = await pool.query(`
      SELECT admin_id, full_name, email
      FROM website_admins
      WHERE admin_id = 2
    `);
    
    if (conflictingAdminResult.rows.length === 0) {
      console.log('✅ No conflicting website admin found');
      return;
    }
    
    const conflictingAdmin = conflictingAdminResult.rows[0];
    console.log(`📊 Found conflicting website admin: ${conflictingAdmin.full_name} (${conflictingAdmin.email})`);
    
    // Check if this is the main admin (omvataliya23@gmail.com)
    if (conflictingAdmin.email === 'omvataliya23@gmail.com') {
      console.log('❌ Cannot remove main admin (omvataliya23@gmail.com)');
      console.log('💡 Alternative solution: Change the company admin user ID');
      return;
    }
    
    // Remove the conflicting website admin
    await pool.query(
      'DELETE FROM website_admins WHERE admin_id = $1',
      [conflictingAdmin.admin_id]
    );
    
    console.log('✅ Conflicting website admin removed successfully!');
    console.log(`📊 Removed: ${conflictingAdmin.full_name} (${conflictingAdmin.email})`);
    
    // Verify the fix
    const verifyResult = await pool.query(`
      SELECT admin_id, full_name, email
      FROM website_admins
      WHERE admin_id = 2
    `);
    
    if (verifyResult.rows.length === 0) {
      console.log('✅ Conflict resolved! No website admin with ID 2');
    } else {
      console.log('❌ Conflict still exists');
    }
    
    // Test company admin authentication
    console.log('\n🧪 Testing company admin authentication...');
    const companyAdminResult = await pool.query(`
      SELECT user_id, full_name, email, role
      FROM users
      WHERE user_id = 2
    `);
    
    if (companyAdminResult.rows.length > 0) {
      const companyAdmin = companyAdminResult.rows[0];
      console.log(`✅ Company admin found: ${companyAdmin.full_name} (${companyAdmin.email})`);
      console.log(`📊 Role: ${companyAdmin.role}`);
      
      if (companyAdmin.role === 'company_admin') {
        console.log('🎉 SUCCESS: Company admin should now be recognized correctly!');
      }
    }
    
  } catch (error) {
    console.error('❌ Error fixing admin conflict:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

fixAdminConflict(); 