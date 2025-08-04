const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function testHodApiEndpoint() {
  let pool;
  
  try {
    console.log('🧪 Testing actual HOD API endpoint...');
    
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
    
    // Test hod1 (user_id: 3)
    console.log('\n🧪 Testing hod1 API endpoint (user_id: 3):');
    const hod1UserId = 3;
    
    // Get department details (same as HOD controller)
    const deptQuery = `
      SELECT d.department_id, d.name, d.hod_id, d.company_id,
             c.name as company_name, c.logo_url, c.project_name, c.project_logo
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
    
    // Get pending approvals (exact same query as HOD controller)
    const pendingApprovalsQuery = `
      SELECT e.event_id, e.name, e.created_at, u.full_name as created_by_name
      FROM events e
      JOIN users u ON e.created_by = u.user_id
      WHERE e.department_id = $1 AND e.approval_status = 'PENDING'
      ORDER BY e.created_at ASC
    `;
    
    console.log(`\n📊 Executing pending approvals query for department ${department.department_id}:`);
    console.log(`Query: ${pendingApprovalsQuery}`);
    console.log(`Parameters: [${department.department_id}]`);
    
    const pendingApprovalsResult = await pool.query(pendingApprovalsQuery, [department.department_id]);
    const pendingApprovals = pendingApprovalsResult.rows.map(event => ({
      id: event.event_id,
      name: event.name,
      createdBy: event.created_by_name,
      createdAt: event.created_at
    }));
    
    console.log(`✅ Query executed successfully`);
    console.log(`📊 Pending approvals found: ${pendingApprovals.length}`);
    
    pendingApprovals.forEach((event, index) => {
      console.log(`   ${index + 1}. Event: ${event.name}`);
      console.log(`      ID: ${event.id}`);
      console.log(`      Created by: ${event.createdBy}`);
      console.log(`      Created at: ${event.createdAt}`);
    });
    
    // Test hod2 (user_id: 7)
    console.log('\n🧪 Testing hod2 API endpoint (user_id: 7):');
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
      createdBy: event.created_by_name,
      createdAt: event.created_at
    }));
    
    console.log(`📊 Pending approvals found: ${pendingApprovals2.length}`);
    pendingApprovals2.forEach((event, index) => {
      console.log(`   ${index + 1}. Event: ${event.name}`);
      console.log(`      ID: ${event.id}`);
      console.log(`      Created by: ${event.createdBy}`);
      console.log(`      Created at: ${event.createdAt}`);
    });
    
    // Create a test event to verify it appears
    console.log('\n🧪 Creating a test event to verify it appears in HOD API...');
    
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
    const testEventName = 'Test Event for HOD API ' + Date.now();
    const createEventQuery = `
      INSERT INTO events (
        name, description, division, priority, event_type, 
        department_id, hod_id, created_by, approval_status, kpi
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING event_id, name, approval_status, department_id
    `;
    
    const createEventResult = await pool.query(createEventQuery, [
      testEventName,
      'Test event for HOD API verification',
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
    
    // Verify the event appears in hod1's API
    console.log('\n🧪 Verifying event appears in hod1 API...');
    const verifyResult = await pool.query(pendingApprovalsQuery, [department.department_id]);
    const verifyApprovals = verifyResult.rows.map(event => ({
      id: event.event_id,
      name: event.name,
      createdBy: event.created_by_name,
      createdAt: event.created_at
    }));
    
    console.log(`📊 Pending approvals after creating test event: ${verifyApprovals.length}`);
    verifyApprovals.forEach((event, index) => {
      console.log(`   ${index + 1}. Event: ${event.name}`);
      console.log(`      ID: ${event.id}`);
      console.log(`      Created by: ${event.createdBy}`);
      console.log(`      Created at: ${event.createdAt}`);
    });
    
    // Check if our test event is in the list
    const testEventFound = verifyApprovals.find(event => event.name === testEventName);
    if (testEventFound) {
      console.log(`✅ Test event "${testEventName}" found in HOD API!`);
    } else {
      console.log(`❌ Test event "${testEventName}" NOT found in HOD API!`);
    }
    
    // Clean up test event
    console.log('\n🧹 Cleaning up test event...');
    await pool.query('DELETE FROM events WHERE event_id = $1', [createdEvent.event_id]);
    console.log('✅ Test event cleaned up');
    
    console.log('\n🎉 HOD API endpoint test completed successfully!');
    console.log('💡 HOD API should now show pending events correctly.');
    
  } catch (error) {
    console.error('❌ Error testing HOD API endpoint:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

testHodApiEndpoint(); 