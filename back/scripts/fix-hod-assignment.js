const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function fixHodAssignment() {
  let pool;
  
  try {
    console.log('🔧 Fixing HOD department assignment...');
    
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
    
    // Get all HODs and their assignments
    console.log('\n📊 Current HOD assignments:');
    const hodAssignments = await pool.query(`
      SELECT u.user_id, u.full_name, u.email, u.department_id, u.role,
             d.department_id as dept_id, d.name as dept_name, d.hod_id
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE u.role = 'hod'
      ORDER BY u.user_id
    `);
    
    hodAssignments.rows.forEach((hod, index) => {
      console.log(`   ${index + 1}. HOD: ${hod.full_name} (${hod.email})`);
      console.log(`      User ID: ${hod.user_id}`);
      console.log(`      User's department_id: ${hod.department_id}`);
      console.log(`      Department: ${hod.dept_name} (ID: ${hod.dept_id})`);
      console.log(`      Department's hod_id: ${hod.hod_id}`);
      console.log('');
    });
    
    // Get all departments and their HOD assignments
    console.log('\n📊 All departments and their HOD assignments:');
    const deptAssignments = await pool.query(`
      SELECT d.department_id, d.name, d.hod_id,
             u.full_name as hod_name, u.email as hod_email
      FROM departments d
      LEFT JOIN users u ON d.hod_id = u.user_id
      ORDER BY d.department_id
    `);
    
    deptAssignments.rows.forEach((dept, index) => {
      console.log(`   ${index + 1}. Department: ${dept.name} (ID: ${dept.department_id})`);
      console.log(`      HOD ID: ${dept.hod_id}`);
      console.log(`      HOD Name: ${dept.hod_name || 'Not assigned'}`);
      console.log(`      HOD Email: ${dept.hod_email || 'Not assigned'}`);
      console.log('');
    });
    
    // Check for conflicts
    console.log('\n🔍 Checking for HOD assignment conflicts:');
    
    // Find HODs assigned to multiple departments
    const multipleDeptHods = await pool.query(`
      SELECT u.user_id, u.full_name, u.email, COUNT(d.department_id) as dept_count
      FROM users u
      JOIN departments d ON u.user_id = d.hod_id
      WHERE u.role = 'hod'
      GROUP BY u.user_id, u.full_name, u.email
      HAVING COUNT(d.department_id) > 1
    `);
    
    if (multipleDeptHods.rows.length > 0) {
      console.log('❌ Found HODs assigned to multiple departments:');
      multipleDeptHods.rows.forEach((hod, index) => {
        console.log(`   ${index + 1}. ${hod.full_name} (${hod.email}) - ${hod.dept_count} departments`);
      });
    } else {
      console.log('✅ No HODs assigned to multiple departments');
    }
    
    // Find departments with multiple HODs
    const multipleHodDepts = await pool.query(`
      SELECT d.department_id, d.name, COUNT(u.user_id) as hod_count
      FROM departments d
      JOIN users u ON d.department_id = u.department_id
      WHERE u.role = 'hod'
      GROUP BY d.department_id, d.name
      HAVING COUNT(u.user_id) > 1
    `);
    
    if (multipleHodDepts.rows.length > 0) {
      console.log('❌ Found departments with multiple HODs:');
      multipleHodDepts.rows.forEach((dept, index) => {
        console.log(`   ${index + 1}. ${dept.name} (ID: ${dept.department_id}) - ${dept.hod_count} HODs`);
      });
    } else {
      console.log('✅ No departments with multiple HODs');
    }
    
    // Fix the assignments
    console.log('\n🔧 Fixing HOD assignments...');
    
    // For hod1 (user_id: 3), ensure they're only assigned to IT & Automation Department (ID: 3)
    console.log('📝 Fixing hod1 assignment...');
    await pool.query(`
      UPDATE departments 
      SET hod_id = NULL 
      WHERE department_id = 4 AND hod_id = 3
    `);
    console.log('✅ Removed hod1 from Test Department (ID: 4)');
    
    // Ensure hod1's user record has correct department_id
    await pool.query(`
      UPDATE users 
      SET department_id = 3 
      WHERE user_id = 3 AND role = 'hod'
    `);
    console.log('✅ Updated hod1 user record to have department_id = 3');
    
    // Verify the fix
    console.log('\n📊 Verifying HOD assignments after fix:');
    const verifyAssignments = await pool.query(`
      SELECT u.user_id, u.full_name, u.email, u.department_id, u.role,
             d.department_id as dept_id, d.name as dept_name, d.hod_id
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE u.role = 'hod'
      ORDER BY u.user_id
    `);
    
    verifyAssignments.rows.forEach((hod, index) => {
      console.log(`   ${index + 1}. HOD: ${hod.full_name} (${hod.email})`);
      console.log(`      User ID: ${hod.user_id}`);
      console.log(`      User's department_id: ${hod.department_id}`);
      console.log(`      Department: ${hod.dept_name} (ID: ${hod.dept_id})`);
      console.log(`      Department's hod_id: ${hod.hod_id}`);
      console.log('');
    });
    
    // Test HOD dashboard query for hod1
    console.log('\n🧪 Testing HOD dashboard query for hod1 after fix:');
    const hod1DashboardQuery = `
      SELECT d.department_id, d.name, d.hod_id
      FROM departments d
      WHERE d.hod_id = 3
    `;
    
    const hod1Result = await pool.query(hod1DashboardQuery);
    console.log(`📊 Departments where hod1 (user_id: 3) is HOD: ${hod1Result.rows.length}`);
    hod1Result.rows.forEach((dept, index) => {
      console.log(`   ${index + 1}. Department: ${dept.name} (ID: ${dept.department_id})`);
    });
    
    // Test pending events for hod1's department
    if (hod1Result.rows.length > 0) {
      const deptId = hod1Result.rows[0].department_id;
      console.log(`\n📊 Testing pending events for department ${deptId}:`);
      
      const pendingEventsQuery = `
        SELECT event_id, name, approval_status, created_at
        FROM events
        WHERE department_id = $1 AND approval_status = 'PENDING'
        ORDER BY created_at ASC
      `;
      
      const pendingEventsResult = await pool.query(pendingEventsQuery, [deptId]);
      console.log(`📊 Pending events found: ${pendingEventsResult.rows.length}`);
      pendingEventsResult.rows.forEach((event, index) => {
        console.log(`   ${index + 1}. Event: ${event.name}`);
        console.log(`      Status: ${event.approval_status}`);
        console.log(`      Created at: ${event.created_at}`);
      });
    }
    
    console.log('\n🎉 HOD assignment fix completed!');
    console.log('💡 HOD dashboard should now show pending events correctly.');
    
  } catch (error) {
    console.error('❌ Error fixing HOD assignment:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

fixHodAssignment(); 