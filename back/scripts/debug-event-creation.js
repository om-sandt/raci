const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function debugEventCreation() {
  let pool;
  
  try {
    console.log('🔍 Debugging event creation and HOD dashboard issue...');
    
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
    
    // Get all events with full details
    console.log('\n📊 All events in the system:');
    const allEventsResult = await pool.query(`
      SELECT e.event_id, e.name, e.approval_status, e.department_id, e.created_at, e.created_by,
             d.name as department_name, d.hod_id, d.company_id,
             u.full_name as created_by_name, u.role as created_by_role,
             c.name as company_name
      FROM events e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN users u ON e.created_by = u.user_id
      LEFT JOIN companies c ON d.company_id = c.company_id
      ORDER BY e.created_at DESC
    `);
    
    console.log(`📊 Total events found: ${allEventsResult.rows.length}`);
    allEventsResult.rows.forEach((event, index) => {
      console.log(`   ${index + 1}. Event: ${event.name}`);
      console.log(`      ID: ${event.event_id}`);
      console.log(`      Status: ${event.approval_status}`);
      console.log(`      Department: ${event.department_name} (ID: ${event.department_id})`);
      console.log(`      Department HOD ID: ${event.hod_id}`);
      console.log(`      Company: ${event.company_name} (ID: ${event.company_id})`);
      console.log(`      Created by: ${event.created_by_name} (${event.created_by_role})`);
      console.log(`      Created at: ${event.created_at}`);
      console.log('');
    });
    
    // Get all HODs
    console.log('\n📊 All HODs in the system:');
    const hodResult = await pool.query(`
      SELECT u.user_id, u.full_name, u.email, u.department_id, u.company_id,
             d.name as department_name, d.hod_id
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.department_id
      WHERE u.role = 'hod'
      ORDER BY u.user_id
    `);
    
    console.log(`📊 Total HODs found: ${hodResult.rows.length}`);
    hodResult.rows.forEach((hod, index) => {
      console.log(`   ${index + 1}. HOD: ${hod.full_name} (${hod.email})`);
      console.log(`      User ID: ${hod.user_id}`);
      console.log(`      Department: ${hod.department_name} (ID: ${hod.department_id})`);
      console.log(`      Department HOD ID: ${hod.hod_id}`);
      console.log(`      Company ID: ${hod.company_id}`);
      console.log('');
    });
    
    // Get all departments
    console.log('\n📊 All departments in the system:');
    const deptResult = await pool.query(`
      SELECT d.department_id, d.name, d.hod_id, d.company_id,
             c.name as company_name,
             u.full_name as hod_name
      FROM departments d
      LEFT JOIN companies c ON d.company_id = c.company_id
      LEFT JOIN users u ON d.hod_id = u.user_id
      ORDER BY d.department_id
    `);
    
    console.log(`📊 Total departments found: ${deptResult.rows.length}`);
    deptResult.rows.forEach((dept, index) => {
      console.log(`   ${index + 1}. Department: ${dept.name}`);
      console.log(`      ID: ${dept.department_id}`);
      console.log(`      HOD ID: ${dept.hod_id}`);
      console.log(`      HOD Name: ${dept.hod_name || 'Not assigned'}`);
      console.log(`      Company: ${dept.company_name} (ID: ${dept.company_id})`);
      console.log('');
    });
    
    // Check for events that should appear in HOD dashboard
    console.log('\n🔍 Checking events that should appear in HOD dashboard:');
    
    for (const hod of hodResult.rows) {
      console.log(`\n📊 Checking for HOD: ${hod.full_name} (${hod.email})`);
      console.log(`   Department: ${hod.department_name} (ID: ${hod.department_id})`);
      
      // Check if HOD's user_id matches department's hod_id
      if (hod.user_id === hod.hod_id) {
        console.log(`   ✅ HOD user_id (${hod.user_id}) matches department hod_id (${hod.hod_id})`);
      } else {
        console.log(`   ❌ MISMATCH: HOD user_id (${hod.user_id}) does NOT match department hod_id (${hod.hod_id})`);
      }
      
      // Get events in this department
      const deptEventsResult = await pool.query(`
        SELECT e.event_id, e.name, e.approval_status, e.created_at, e.created_by,
               u.full_name as created_by_name
        FROM events e
        LEFT JOIN users u ON e.created_by = u.user_id
        WHERE e.department_id = $1
        ORDER BY e.created_at DESC
      `, [hod.department_id]);
      
      console.log(`   📊 Events in department: ${deptEventsResult.rows.length}`);
      deptEventsResult.rows.forEach((event, index) => {
        console.log(`      ${index + 1}. Event: ${event.name}`);
        console.log(`         Status: ${event.approval_status}`);
        console.log(`         Created by: ${event.created_by_name}`);
        console.log(`         Created at: ${event.created_at}`);
      });
      
      // Get pending events specifically
      const pendingEventsResult = await pool.query(`
        SELECT e.event_id, e.name, e.created_at, e.created_by,
               u.full_name as created_by_name
        FROM events e
        LEFT JOIN users u ON e.created_by = u.user_id
        WHERE e.department_id = $1 AND e.approval_status = 'PENDING'
        ORDER BY e.created_at ASC
      `, [hod.department_id]);
      
      console.log(`   📊 PENDING events in department: ${pendingEventsResult.rows.length}`);
      pendingEventsResult.rows.forEach((event, index) => {
        console.log(`      ${index + 1}. Event: ${event.name}`);
        console.log(`         Created by: ${event.created_by_name}`);
        console.log(`         Created at: ${event.created_at}`);
      });
      
      // Test the exact HOD dashboard query
      console.log(`   🧪 Testing HOD dashboard query for department ${hod.department_id}:`);
      const hodDashboardQuery = `
        SELECT event_id, name, created_at
        FROM events
        WHERE department_id = $1 AND approval_status = 'PENDING'
        ORDER BY created_at ASC
      `;
      
      try {
        const hodDashboardResult = await pool.query(hodDashboardQuery, [hod.department_id]);
        console.log(`      ✅ HOD dashboard query returned: ${hodDashboardResult.rows.length} events`);
        hodDashboardResult.rows.forEach((event, index) => {
          console.log(`         ${index + 1}. Event: ${event.name}`);
        });
      } catch (error) {
        console.log(`      ❌ HOD dashboard query failed: ${error.message}`);
      }
    }
    
    // Check for any events without department_id
    console.log('\n📊 Events without department_id:');
    const eventsWithoutDept = await pool.query(`
      SELECT event_id, name, approval_status, department_id, created_at
      FROM events
      WHERE department_id IS NULL
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Events without department: ${eventsWithoutDept.rows.length}`);
    eventsWithoutDept.rows.forEach((event, index) => {
      console.log(`   ${index + 1}. Event: ${event.name}`);
      console.log(`      Status: ${event.approval_status}`);
      console.log(`      Created at: ${event.created_at}`);
    });
    
  } catch (error) {
    console.error('❌ Error debugging event creation:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

debugEventCreation(); 