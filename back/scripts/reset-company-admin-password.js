const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();

async function resetCompanyAdminPassword() {
  let pool;
  
  try {
    console.log('🔧 Resetting company admin password...');
    
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
    
    // Get company admin user
    const userResult = await pool.query(`
      SELECT user_id, full_name, email, role, company_id
      FROM users
      WHERE role = 'company_admin'
      LIMIT 1
    `);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No company admin found');
      return;
    }
    
    const companyAdmin = userResult.rows[0];
    console.log(`📊 Found company admin: ${companyAdmin.full_name} (${companyAdmin.email})`);
    
    // Set new password
    const newPassword = 'password123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password in database
    await pool.query(
      'UPDATE users SET password = $1 WHERE user_id = $2',
      [hashedPassword, companyAdmin.user_id]
    );
    
    console.log('✅ Password updated successfully!');
    console.log(`📊 New password: ${newPassword}`);
    console.log(`📊 Email: ${companyAdmin.email}`);
    console.log('\n💡 You can now log in with these credentials:');
    console.log(`   Email: ${companyAdmin.email}`);
    console.log(`   Password: ${newPassword}`);
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

resetCompanyAdminPassword(); 