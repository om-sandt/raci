const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function testHodApi() {
  let pool;
  
  try {
    console.log('🧪 Testing HOD API endpoint...');
    
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
    
    // Simulate the exact HOD controller query
    console.log('\n🧪 Testing HOD controller query (exact same as controller):');
    const departmentId = hod.department_id;
    
    // Get department details
    const departmentQuery = `
      SELECT department_id, name, hod_id, company_id
      FROM departments
      WHERE department_id = $1
    `;
    
    const departmentResult = await pool.query(departmentQuery, [departmentId]);
    if (departmentResult.rows.length === 0) {
      console.log('❌ Department not found');
      return;
    }
    
    const department = departmentResult.rows[0];
    console.log(`📊 Department: ${department.name} (ID: ${department.department_id})`);
    
    // Get pending approvals (exact same query as HOD controller)
    const pendingApprovalsQuery = `
      SELECT e.event_id, e.name, e.created_at, u.full_name as created_by_name
      FROM events e
      JOIN users u ON e.created_by = u.user_id
      WHERE e.department_id = $1 AND e.approval_status = 'PENDING'
      ORDER BY e.created_at ASC
    `;
    
    console.log(`\n📊 Executing pending approvals query for department ${departmentId}:`);
    console.log(`Query: ${pendingApprovalsQuery}`);
    console.log(`Parameters: [${departmentId}]`);
    
    const pendingApprovalsResult = await pool.query(pendingApprovalsQuery, [departmentId]);
    console.log(`✅ Query executed successfully`);
    console.log(`📊 Pending approvals found: ${pendingApprovalsResult.rows.length}`);
    
    pendingApprovalsResult.rows.forEach((event, index) => {
      console.log(`   ${index + 1}. Event ID: ${event.event_id}`);
      console.log(`      Name: ${event.name}`);
      console.log(`      Created by: ${event.created_by_name}`);
      console.log(`      Created at: ${event.created_at}`);
      console.log(`      Status: PENDING`);
      console.log('');
    });
    
    // Test the response format (same as HOD controller)
    const pendingApprovals = pendingApprovalsResult.rows.map(event => ({
      id: event.event_id,
      name: event.name,
      createdBy: event.created_by_name,
      createdAt: event.created_at
    }));
    
    console.log('📊 Formatted response (same as controller):');
    console.log(JSON.stringify(pendingApprovals, null, 2));
    
    // Also test the events query to see all events
    console.log('\n📊 All events in department:');
    const allEventsQuery = `
      SELECT e.event_id, e.name, e.approval_status, e.created_at, u.full_name as created_by_name
      FROM events e
      LEFT JOIN users u ON e.created_by = u.user_id
      WHERE e.department_id = $1
      ORDER BY e.created_at DESC
    `;
    
    const allEventsResult = await pool.query(allEventsQuery, [departmentId]);
    console.log(`📊 Total events in department: ${allEventsResult.rows.length}`);
    
    allEventsResult.rows.forEach((event, index) => {
      console.log(`   ${index + 1}. Event: ${event.name}`);
      console.log(`      Status: ${event.approval_status}`);
      console.log(`      Created by: ${event.created_by_name}`);
      console.log(`      Created at: ${event.created_at}`);
      console.log('');
    });
    
    // Check if there are any events with different status values
    console.log('\n📊 Checking for events with different status values:');
    const statusCheckQuery = `
      SELECT DISTINCT approval_status, COUNT(*) as count
      FROM events
      WHERE department_id = $1
      GROUP BY approval_status
    `;
    
    const statusResult = await pool.query(statusCheckQuery, [departmentId]);
    statusResult.rows.forEach(status => {
      console.log(`   Status: '${status.approval_status}' - ${status.count} events`);
    });
    
  } catch (error) {
    console.error('❌ Error testing HOD API:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

testHodApi(); 