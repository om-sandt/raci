const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function testHodDashboard() {
  let pool;
  
  try {
    console.log('🧪 Testing HOD dashboard API...');
    
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
    
    // Simulate the exact HOD dashboard query
    console.log('\n🧪 Testing HOD dashboard query (exact same as controller):');
    const userId = hod.user_id;
    const departmentId = hod.department_id;
    
    // Get department information with company logos
    const deptQuery = `
      SELECT d.department_id, d.name, c.company_id, c.name as company_name, c.logo_url, c.project_name, c.project_logo
      FROM departments d
      JOIN companies c ON d.company_id = c.company_id
      WHERE d.hod_id = $1
    `;
    
    const deptResult = await pool.query(deptQuery, [userId]);
    if (deptResult.rows.length === 0) {
      console.log('❌ Department not found for HOD');
      return;
    }
    
    const department = deptResult.rows[0];
    console.log(`📊 Department: ${department.name} (ID: ${department.department_id})`);
    console.log(`📊 Company: ${department.company_name} (ID: ${department.company_id})`);
    
    // Get department user count
    const userCountQuery = 'SELECT COUNT(*) FROM users WHERE department_id = $1';
    const userCountResult = await pool.query(userCountQuery, [departmentId]);
    const userCount = parseInt(userCountResult.rows[0].count);
    console.log(`📊 Users in department: ${userCount}`);
    
    // Get event statistics for this department (FIXED VERSION)
    const eventStatsQuery = `
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE approval_status = 'PENDING') AS pending,
        COUNT(*) FILTER (WHERE approval_status = 'APPROVED') AS approved,
        COUNT(*) FILTER (WHERE approval_status = 'REJECTED') AS rejected
      FROM events
      WHERE department_id = $1
    `;
    
    console.log(`\n📊 Executing event statistics query for department ${departmentId}:`);
    console.log(`Query: ${eventStatsQuery}`);
    console.log(`Parameters: [${departmentId}]`);
    
    const eventStatsResult = await pool.query(eventStatsQuery, [departmentId]);
    const eventStats = eventStatsResult.rows[0];
    console.log(`✅ Event statistics query executed successfully`);
    console.log(`📊 Event statistics:`);
    console.log(`   Total: ${eventStats.total}`);
    console.log(`   Pending: ${eventStats.pending}`);
    console.log(`   Approved: ${eventStats.approved}`);
    console.log(`   Rejected: ${eventStats.rejected}`);
    
    // Get recent events for this department
    const recentEventsQuery = `
      SELECT e.event_id, e.name, e.approval_status, e.created_at, u.full_name as creator_name
      FROM events e
      JOIN users u ON e.created_by = u.user_id
      WHERE e.department_id = $1
      ORDER BY e.created_at DESC
      LIMIT 5
    `;
    
    console.log(`\n📊 Executing recent events query for department ${departmentId}:`);
    const recentEventsResult = await pool.query(recentEventsQuery, [departmentId]);
    console.log(`✅ Recent events query executed successfully`);
    console.log(`📊 Recent events found: ${recentEventsResult.rows.length}`);
    
    recentEventsResult.rows.forEach((event, index) => {
      console.log(`   ${index + 1}. Event: ${event.name}`);
      console.log(`      Status: ${event.approval_status}`);
      console.log(`      Created by: ${event.creator_name}`);
      console.log(`      Created at: ${event.created_at}`);
      console.log('');
    });
    
    // Get pending approvals
    const pendingApprovalsQuery = `
      SELECT event_id, name, created_at
      FROM events
      WHERE department_id = $1 AND approval_status = 'PENDING'
      ORDER BY created_at ASC
    `;
    
    console.log(`📊 Executing pending approvals query for department ${departmentId}:`);
    const pendingApprovalsResult = await pool.query(pendingApprovalsQuery, [departmentId]);
    console.log(`✅ Pending approvals query executed successfully`);
    console.log(`📊 Pending approvals found: ${pendingApprovalsResult.rows.length}`);
    
    pendingApprovalsResult.rows.forEach((event, index) => {
      console.log(`   ${index + 1}. Event: ${event.name}`);
      console.log(`      ID: ${event.event_id}`);
      console.log(`      Created at: ${event.created_at}`);
      console.log('');
    });
    
    // Format the response (same as HOD dashboard controller)
    const recentEvents = recentEventsResult.rows.map(event => ({
      id: event.event_id,
      name: event.name,
      createdBy: event.creator_name,
      status: event.approval_status,
      createdAt: event.created_at
    }));
    
    const pendingApprovals = pendingApprovalsResult.rows.map(event => ({
      id: event.event_id,
      name: event.name,
      createdAt: event.created_at
    }));
    
    console.log('📊 Formatted dashboard response:');
    console.log(JSON.stringify({
      department: {
        id: department.department_id,
        name: department.name,
        company: {
          id: department.company_id,
          name: department.company_name
        }
      },
      stats: {
        users: userCount,
        events: {
          total: parseInt(eventStats.total),
          pending: parseInt(eventStats.pending),
          approved: parseInt(eventStats.approved),
          rejected: parseInt(eventStats.rejected)
        }
      },
      recentEvents,
      pendingApprovals
    }, null, 2));
    
    console.log('\n🎉 HOD dashboard API test completed successfully!');
    console.log('💡 The dashboard should now show the pending event correctly.');
    
  } catch (error) {
    console.error('❌ Error testing HOD dashboard:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

testHodDashboard(); 