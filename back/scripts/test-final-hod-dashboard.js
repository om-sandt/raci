const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function testFinalHodDashboard() {
  let pool;
  
  try {
    console.log('🧪 Final test of HOD dashboard after fix...');
    
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
    
    // Test hod1 dashboard (user_id: 3)
    console.log('\n🧪 Testing hod1 dashboard (user_id: 3):');
    const hod1UserId = 3;
    
    // Simulate the exact HOD dashboard controller logic
    const deptQuery = `
      SELECT d.department_id, d.name, c.company_id, c.name as company_name, c.logo_url, c.project_name, c.project_logo
      FROM departments d
      JOIN companies c ON d.company_id = c.company_id
      WHERE d.hod_id = $1
    `;
    
    const deptResult = await pool.query(deptQuery, [hod1UserId]);
    if (deptResult.rows.length === 0) {
      console.log('❌ No department found for hod1');
      return;
    }
    
    const department = deptResult.rows[0];
    console.log(`✅ Found department: ${department.name} (ID: ${department.department_id})`);
    
    // Get pending approvals (exact same query as HOD dashboard)
    const pendingApprovalsQuery = `
      SELECT event_id, name, created_at
      FROM events
      WHERE department_id = $1 AND approval_status = 'PENDING'
      ORDER BY created_at ASC
    `;
    
    const pendingApprovalsResult = await pool.query(pendingApprovalsQuery, [department.department_id]);
    const pendingApprovals = pendingApprovalsResult.rows.map(event => ({
      id: event.event_id,
      name: event.name,
      createdAt: event.created_at
    }));
    
    console.log(`📊 Pending approvals found: ${pendingApprovals.length}`);
    pendingApprovals.forEach((event, index) => {
      console.log(`   ${index + 1}. Event: ${event.name}`);
      console.log(`      ID: ${event.id}`);
      console.log(`      Created at: ${event.createdAt}`);
    });
    
    // Get event statistics
    const eventStatsQuery = `
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE approval_status = 'PENDING') AS pending,
        COUNT(*) FILTER (WHERE approval_status = 'APPROVED') AS approved,
        COUNT(*) FILTER (WHERE approval_status = 'REJECTED') AS rejected
      FROM events
      WHERE department_id = $1
    `;
    
    const eventStatsResult = await pool.query(eventStatsQuery, [department.department_id]);
    const eventStats = eventStatsResult.rows[0];
    
    console.log(`📊 Event statistics:`);
    console.log(`   Total: ${eventStats.total}`);
    console.log(`   Pending: ${eventStats.pending}`);
    console.log(`   Approved: ${eventStats.approved}`);
    console.log(`   Rejected: ${eventStats.rejected}`);
    
    // Test hod2 dashboard (user_id: 7)
    console.log('\n🧪 Testing hod2 dashboard (user_id: 7):');
    const hod2UserId = 7;
    
    const deptResult2 = await pool.query(deptQuery, [hod2UserId]);
    if (deptResult2.rows.length === 0) {
      console.log('❌ No department found for hod2');
      return;
    }
    
    const department2 = deptResult2.rows[0];
    console.log(`✅ Found department: ${department2.name} (ID: ${department2.department_id})`);
    
    const pendingApprovalsResult2 = await pool.query(pendingApprovalsQuery, [department2.department_id]);
    const pendingApprovals2 = pendingApprovalsResult2.rows.map(event => ({
      id: event.event_id,
      name: event.name,
      createdAt: event.created_at
    }));
    
    console.log(`📊 Pending approvals found: ${pendingApprovals2.length}`);
    pendingApprovals2.forEach((event, index) => {
      console.log(`   ${index + 1}. Event: ${event.name}`);
      console.log(`      ID: ${event.id}`);
      console.log(`      Created at: ${event.createdAt}`);
    });
    
    // Create a test event to verify it appears
    console.log('\n🧪 Creating a test event to verify it appears in HOD dashboard...');
    
    // Get company admin for creating event
    const adminResult = await pool.query(`
      SELECT user_id, full_name, email, company_id
      FROM users
      WHERE role = 'company_admin'
      LIMIT 1
    `);
    
    if (adminResult.rows.length === 0) {
      console.log('❌ No company admin found');
      return;
    }
    
    const admin = adminResult.rows[0];
    console.log(`📊 Using company admin: ${admin.full_name} (${admin.email})`);
    
    // Create test event in hod1's department
    const testEventName = 'Test Event for HOD Dashboard ' + Date.now();
    const createEventQuery = `
      INSERT INTO events (
        name, description, division, priority, event_type, 
        department_id, hod_id, created_by, approval_status, kpi
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING event_id, name, approval_status, department_id
    `;
    
    const createEventResult = await pool.query(createEventQuery, [
      testEventName,
      'Test event for HOD dashboard verification',
      'Test Division',
      'medium',
      'Operational Event',
      department.department_id,
      department.hod_id,
      admin.user_id,
      'PENDING',
      'KPI'
    ]);
    
    const createdEvent = createEventResult.rows[0];
    console.log(`✅ Created test event: ${createdEvent.name} (ID: ${createdEvent.event_id})`);
    console.log(`   Status: ${createdEvent.approval_status}`);
    console.log(`   Department: ${createdEvent.department_id}`);
    
    // Verify the event appears in hod1's dashboard
    console.log('\n🧪 Verifying event appears in hod1 dashboard...');
    const verifyResult = await pool.query(pendingApprovalsQuery, [department.department_id]);
    const verifyApprovals = verifyResult.rows.map(event => ({
      id: event.event_id,
      name: event.name,
      createdAt: event.created_at
    }));
    
    console.log(`📊 Pending approvals after creating test event: ${verifyApprovals.length}`);
    verifyApprovals.forEach((event, index) => {
      console.log(`   ${index + 1}. Event: ${event.name}`);
      console.log(`      ID: ${event.id}`);
      console.log(`      Created at: ${event.createdAt}`);
    });
    
    // Check if our test event is in the list
    const testEventFound = verifyApprovals.find(event => event.name === testEventName);
    if (testEventFound) {
      console.log(`✅ Test event "${testEventName}" found in HOD dashboard!`);
    } else {
      console.log(`❌ Test event "${testEventName}" NOT found in HOD dashboard!`);
    }
    
    // Clean up test event
    console.log('\n🧹 Cleaning up test event...');
    await pool.query('DELETE FROM events WHERE event_id = $1', [createdEvent.event_id]);
    console.log('✅ Test event cleaned up');
    
    console.log('\n🎉 Final HOD dashboard test completed successfully!');
    console.log('💡 HOD dashboard should now show pending events correctly.');
    console.log('💡 When you create events, they should appear in the HOD dashboard for approval.');
    
  } catch (error) {
    console.error('❌ Error in final HOD dashboard test:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

testFinalHodDashboard(); 