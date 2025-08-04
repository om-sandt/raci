const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function checkUsers() {
  let pool;
  
  try {
    console.log('🔍 Checking existing users...');
    
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
    if (adminResult.rows.length === 0) {
      console.log('❌ No website admins found');
    } else {
      adminResult.rows.forEach(admin => {
        console.log(`- ID: ${admin.admin_id}, Name: ${admin.full_name}, Email: ${admin.email}, Role: website_admin`);
      });
    }
    
    // Check regular users
    const userResult = await pool.query(`
      SELECT user_id, full_name, email, role, company_id
      FROM users
      ORDER BY user_id
    `);
    
    console.log('\n📊 Regular Users:');
    if (userResult.rows.length === 0) {
      console.log('❌ No users found');
    } else {
      userResult.rows.forEach(user => {
        console.log(`- ID: ${user.user_id}, Name: ${user.full_name}, Email: ${user.email}, Role: ${user.role}, Company: ${user.company_id}`);
      });
    }
    
    // Check companies
    const companyResult = await pool.query(`
      SELECT company_id, name
      FROM companies
      ORDER BY company_id
    `);
    
    console.log('\n📊 Companies:');
    if (companyResult.rows.length === 0) {
      console.log('❌ No companies found');
    } else {
      companyResult.rows.forEach(company => {
        console.log(`- ID: ${company.company_id}, Name: ${company.name}`);
      });
    }
    
    // Check for company admins specifically
    const companyAdminResult = await pool.query(`
      SELECT user_id, full_name, email, company_id
      FROM users
      WHERE role = 'company_admin'
      ORDER BY user_id
    `);
    
    console.log('\n📊 Company Admins:');
    if (companyAdminResult.rows.length === 0) {
      console.log('❌ No company admins found');
      console.log('💡 You need to create a company admin user to create events');
    } else {
      companyAdminResult.rows.forEach(admin => {
        console.log(`- ID: ${admin.user_id}, Name: ${admin.full_name}, Email: ${admin.email}, Company: ${admin.company_id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

checkUsers(); 