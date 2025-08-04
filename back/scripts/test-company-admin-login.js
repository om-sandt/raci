const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

async function testCompanyAdminLogin() {
  let pool;
  
  try {
    console.log('🧪 Testing company admin login...');
    
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
      SELECT user_id, full_name, email, password, role, company_id
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
    console.log(`📊 Role: ${companyAdmin.role}, Company ID: ${companyAdmin.company_id}`);
    
    // Test password (assuming default password is 'password123')
    const testPassword = 'password123';
    const isMatch = await bcrypt.compare(testPassword, companyAdmin.password);
    
    if (!isMatch) {
      console.log('❌ Password does not match. Please check the password.');
      console.log('💡 You may need to reset the password or use the correct password.');
      return;
    }
    
    console.log('✅ Password matches!');
    
    // Generate token like the auth controller does
    const token = jwt.sign(
      { id: companyAdmin.user_id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('✅ Token generated successfully');
    console.log(`📊 Token: ${token.substring(0, 50)}...`);
    
    // Decode token to verify
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`📊 Decoded token ID: ${decoded.id}`);
    
    // Simulate the auth middleware check
    const adminResult = await pool.query(
      'SELECT admin_id, full_name, email FROM website_admins WHERE admin_id = $1',
      [decoded.id]
    );
    
    if (adminResult.rows.length > 0) {
      console.log('❌ This would be recognized as a website admin');
    } else {
      console.log('✅ This would NOT be recognized as a website admin');
      
      // Check if it's a regular user
      const userResult = await pool.query(
        'SELECT user_id, full_name, email, role, company_id FROM users WHERE user_id = $1',
        [decoded.id]
      );
      
      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        console.log(`✅ This would be recognized as a regular user: ${user.role}`);
        console.log(`📊 User details: ${user.full_name} (${user.email}), Company: ${user.company_id}`);
        
        if (user.role === 'company_admin') {
          console.log('🎉 SUCCESS: Company admin authentication would work correctly!');
        } else {
          console.log(`❌ User role is ${user.role}, not company_admin`);
        }
      } else {
        console.log('❌ User not found in database');
      }
    }
    
    // Test the events route authorization
    console.log('\n🔍 Testing events route authorization...');
    console.log('📊 Events route requires: company_admin or hod');
    console.log(`📊 User role: ${companyAdmin.role}`);
    
    if (companyAdmin.role === 'company_admin' || companyAdmin.role === 'hod') {
      console.log('✅ User would be authorized to access events route');
    } else {
      console.log('❌ User would NOT be authorized to access events route');
    }
    
  } catch (error) {
    console.error('❌ Error testing company admin login:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

testCompanyAdminLogin(); 