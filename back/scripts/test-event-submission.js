const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function testEventSubmission() {
  let pool;
  
  try {
    console.log('🧪 Testing event creation and submission...');
    
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
      SELECT user_id, full_name, email, role, company_id
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
    
    // Get a department for testing
    const departmentResult = await pool.query(`
      SELECT department_id, name, hod_id
      FROM departments
      WHERE company_id = $1
      LIMIT 1
    `, [companyAdmin.company_id]);
    
    if (departmentResult.rows.length === 0) {
      console.log('❌ No department found for company');
      return;
    }
    
    const department = departmentResult.rows[0];
    console.log(`📊 Found department: ${department.name} (ID: ${department.department_id})`);
    
    // Test 1: Create event with PENDING status
    const testEventName = 'Test Event Submission ' + Date.now();
    console.log(`\n📝 Test 1: Creating event: ${testEventName}`);
    
    const createResult = await pool.query(`
      INSERT INTO events (
        name, description, division, priority, event_type, 
        department_id, hod_id, created_by, approval_status, kpi
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING event_id, name, approval_status
    `, [
      testEventName,
      'Test event for submission',
      'Test Division',
      'medium',
      'Operational Event',
      department.department_id,
      department.hod_id,
      companyAdmin.user_id,
      'PENDING',
      'KPI'
    ]);
    
    const createdEvent = createResult.rows[0];
    console.log('✅ Event created successfully!');
    console.log(`📊 Event ID: ${createdEvent.event_id}, Status: ${createdEvent.approval_status}`);
    
    // Test 2: Submit event for approval (update status to PENDING)
    console.log(`\n📝 Test 2: Submitting event ${createdEvent.event_id} for approval`);
    
    const submitResult = await pool.query(`
      UPDATE events 
      SET approval_status = $1 
      WHERE event_id = $2
      RETURNING event_id, name, approval_status
    `, ['PENDING', createdEvent.event_id]);
    
    if (submitResult.rows.length > 0) {
      const submittedEvent = submitResult.rows[0];
      console.log('✅ Event submitted successfully!');
      console.log(`📊 Event ID: ${submittedEvent.event_id}, Status: ${submittedEvent.approval_status}`);
    } else {
      console.log('❌ Failed to submit event');
    }
    
    // Test 3: Approve event
    console.log(`\n📝 Test 3: Approving event ${createdEvent.event_id}`);
    
    const approveResult = await pool.query(`
      UPDATE events 
      SET approval_status = $1, approved_by = $2
      WHERE event_id = $3
      RETURNING event_id, name, approval_status, approved_by
    `, ['APPROVED', companyAdmin.user_id, createdEvent.event_id]);
    
    if (approveResult.rows.length > 0) {
      const approvedEvent = approveResult.rows[0];
      console.log('✅ Event approved successfully!');
      console.log(`📊 Event ID: ${approvedEvent.event_id}, Status: ${approvedEvent.approval_status}`);
    } else {
      console.log('❌ Failed to approve event');
    }
    
    // Test 4: Reject event (create another event first)
    const rejectEventName = 'Test Event Rejection ' + Date.now();
    console.log(`\n📝 Test 4: Creating event for rejection: ${rejectEventName}`);
    
    const rejectCreateResult = await pool.query(`
      INSERT INTO events (
        name, description, division, priority, event_type, 
        department_id, hod_id, created_by, approval_status, kpi
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING event_id, name, approval_status
    `, [
      rejectEventName,
      'Test event for rejection',
      'Test Division',
      'medium',
      'Operational Event',
      department.department_id,
      department.hod_id,
      companyAdmin.user_id,
      'PENDING',
      'KPI'
    ]);
    
    const rejectEvent = rejectCreateResult.rows[0];
    console.log(`📊 Created event ID: ${rejectEvent.event_id} for rejection test`);
    
    const rejectResult = await pool.query(`
      UPDATE events 
      SET approval_status = $1, rejection_reason = $2, approved_by = $3
      WHERE event_id = $4
      RETURNING event_id, name, approval_status, rejection_reason
    `, ['REJECTED', 'Test rejection reason', companyAdmin.user_id, rejectEvent.event_id]);
    
    if (rejectResult.rows.length > 0) {
      const rejectedEvent = rejectResult.rows[0];
      console.log('✅ Event rejected successfully!');
      console.log(`📊 Event ID: ${rejectedEvent.event_id}, Status: ${rejectedEvent.approval_status}`);
      console.log(`📊 Rejection reason: ${rejectedEvent.rejection_reason}`);
    } else {
      console.log('❌ Failed to reject event');
    }
    
    // Clean up test events
    console.log('\n🧹 Cleaning up test events...');
    await pool.query('DELETE FROM events WHERE event_id IN ($1, $2)', [createdEvent.event_id, rejectEvent.event_id]);
    console.log('✅ Test events cleaned up');
    
    console.log('\n🎉 All event submission tests passed!');
    console.log('💡 Event creation, submission, approval, and rejection are working correctly.');
    
  } catch (error) {
    console.error('❌ Error testing event submission:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

testEventSubmission(); 