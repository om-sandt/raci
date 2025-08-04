const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function checkAdminConflict() {
  let pool;
  
  try {
    console.log('🔍 Checking for admin ID conflicts...');
    
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
    
    // Check website admins
    const adminResult = await pool.query(`
      SELECT admin_id, full_name, email
      FROM website_admins
      ORDER BY admin_id
    `);
    
    console.log('\n📊 Website Admins:');
    adminResult.rows.forEach(admin => {
      console.log(`- ID: ${admin.admin_id}, Name: ${admin.full_name}, Email: ${admin.email}`);
    });
    
    // Check company admin
    const companyAdminResult = await pool.query(`
      SELECT user_id, full_name, email, role
      FROM users
      WHERE role = 'company_admin'
      ORDER BY user_id
    `);
    
    console.log('\n📊 Company Admin:');
    companyAdminResult.rows.forEach(user => {
      console.log(`- ID: ${user.user_id}, Name: ${user.full_name}, Email: ${user.email}, Role: ${user.role}`);
    });
    
    // Check for conflicts
    const companyAdminId = companyAdminResult.rows[0]?.user_id;
    const websiteAdminIds = adminResult.rows.map(admin => admin.admin_id);
    
    console.log('\n🔍 Checking for ID conflicts...');
    console.log(`📊 Company Admin ID: ${companyAdminId}`);
    console.log(`📊 Website Admin IDs: ${websiteAdminIds.join(', ')}`);
    
    if (websiteAdminIds.includes(companyAdminId)) {
      console.log('❌ CONFLICT FOUND: Company admin ID exists in website_admins table!');
      console.log('💡 This is why the authentication middleware recognizes it as a website admin.');
      
      // Check if we can fix this by removing the conflicting entry
      const conflictingAdmin = adminResult.rows.find(admin => admin.admin_id === companyAdminId);
      console.log(`📊 Conflicting entry: ${conflictingAdmin.full_name} (${conflictingAdmin.email})`);
      
      console.log('\n💡 Solution: Remove the conflicting website admin entry');
      console.log('   This will allow the company admin to be recognized correctly.');
      
    } else {
      console.log('✅ No ID conflicts found');
    }
    
  } catch (error) {
    console.error('❌ Error checking admin conflict:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

checkAdminConflict(); 