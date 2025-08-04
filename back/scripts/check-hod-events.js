const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function checkHodEvents() {
  let pool;
  
  try {
    console.log('🔍 Checking HOD dashboard events...');
    
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
    
    // Get HOD user
    const hodResult = await pool.query(`
      SELECT user_id, full_name, email, role, company_id, department_id
      FROM users
      WHERE role = 'hod'
      LIMIT 1
    `);
    
    if (hodResult.rows.length === 0) {
      console.log('❌ No HOD found');
      return;
    }
    
    const hod = hodResult.rows[0];
    console.log(`📊 Found HOD: ${hod.full_name} (${hod.email})`);
    console.log(`📊 HOD Department ID: ${hod.department_id}`);
    console.log(`📊 HOD Company ID: ${hod.company_id}`);
    
    // Get all events in the system
    console.log('\n📊 All events in the system:');
    const allEventsResult = await pool.query(`
      SELECT e.event_id, e.name, e.approval_status, e.department_id, e.created_at,
             d.name as department_name, d.company_id,
             u.full_name as created_by_name, u.role as created_by_role
      FROM events e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN users u ON e.created_by = u.user_id
      ORDER BY e.created_at DESC
    `);
    
    console.log(`📊 Total events found: ${allEventsResult.rows.length}`);
    allEventsResult.rows.forEach((event, index) => {
      console.log(`   ${index + 1}. Event: ${event.name}`);
      console.log(`      Status: ${event.approval_status}`);
      console.log(`      Department: ${event.department_name} (ID: ${event.department_id})`);
      console.log(`      Company: ${event.company_id}`);
      console.log(`      Created by: ${event.created_by_name} (${event.created_by_role})`);
      console.log(`      Created at: ${event.created_at}`);
      console.log('');
    });
    
    // Check HOD's department events specifically
    console.log(`\n📊 Events in HOD's department (ID: ${hod.department_id}):`);
    const hodDepartmentEvents = await pool.query(`
      SELECT e.event_id, e.name, e.approval_status, e.department_id, e.created_at,
             d.name as department_name,
             u.full_name as created_by_name
      FROM events e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN users u ON e.created_by = u.user_id
      WHERE e.department_id = $1
      ORDER BY e.created_at DESC
    `, [hod.department_id]);
    
    console.log(`📊 Events in HOD's department: ${hodDepartmentEvents.rows.length}`);
    hodDepartmentEvents.rows.forEach((event, index) => {
      console.log(`   ${index + 1}. Event: ${event.name}`);
      console.log(`      Status: ${event.approval_status}`);
      console.log(`      Created by: ${event.created_by_name}`);
      console.log(`      Created at: ${event.created_at}`);
      console.log('');
    });
    
    // Check pending events in HOD's department (what should appear in dashboard)
    console.log(`\n📊 PENDING events in HOD's department (should appear in dashboard):`);
    const pendingEvents = await pool.query(`
      SELECT e.event_id, e.name, e.approval_status, e.department_id, e.created_at,
             d.name as department_name,
             u.full_name as created_by_name
      FROM events e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN users u ON e.created_by = u.user_id
      WHERE e.department_id = $1 AND e.approval_status = 'PENDING'
      ORDER BY e.created_at DESC
    `, [hod.department_id]);
    
    console.log(`📊 PENDING events in HOD's department: ${pendingEvents.rows.length}`);
    pendingEvents.rows.forEach((event, index) => {
      console.log(`   ${index + 1}. Event: ${event.name}`);
      console.log(`      Status: ${event.approval_status}`);
      console.log(`      Created by: ${event.created_by_name}`);
      console.log(`      Created at: ${event.created_at}`);
      console.log('');
    });
    
    // Check if there are events with different statuses
    console.log(`\n📊 Events by status in HOD's department:`);
    const eventsByStatus = await pool.query(`
      SELECT e.approval_status, COUNT(*) as count
      FROM events e
      WHERE e.department_id = $1
      GROUP BY e.approval_status
      ORDER BY e.approval_status
    `, [hod.department_id]);
    
    eventsByStatus.rows.forEach(status => {
      console.log(`   ${status.approval_status}: ${status.count} events`);
    });
    
    // Check if there are any events without department_id
    console.log(`\n📊 Events without department_id:`);
    const eventsWithoutDept = await pool.query(`
      SELECT e.event_id, e.name, e.approval_status, e.department_id, e.created_at
      FROM events e
      WHERE e.department_id IS NULL
      ORDER BY e.created_at DESC
    `);
    
    console.log(`📊 Events without department: ${eventsWithoutDept.rows.length}`);
    eventsWithoutDept.rows.forEach((event, index) => {
      console.log(`   ${index + 1}. Event: ${event.name}`);
      console.log(`      Status: ${event.approval_status}`);
      console.log(`      Created at: ${event.created_at}`);
      console.log('');
    });
    
    // Check the HOD controller query (simulate what the dashboard does)
    console.log(`\n🧪 Testing HOD controller query (simulating dashboard):`);
    const hodControllerQuery = `
      SELECT e.event_id, e.name, e.created_at, u.full_name as created_by_name
      FROM events e
      JOIN users u ON e.created_by = u.user_id
      WHERE e.department_id = $1 AND e.approval_status = 'PENDING'
      ORDER BY e.created_at ASC
    `;
    
    try {
      const hodControllerResult = await pool.query(hodControllerQuery, [hod.department_id]);
      console.log(`✅ HOD controller query returned: ${hodControllerResult.rows.length} events`);
      hodControllerResult.rows.forEach((event, index) => {
        console.log(`   ${index + 1}. Event: ${event.name}`);
        console.log(`      Created by: ${event.created_by_name}`);
        console.log(`      Created at: ${event.created_at}`);
        console.log('');
      });
    } catch (error) {
      console.log(`❌ HOD controller query failed: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ Error checking HOD events:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

checkHodEvents(); 