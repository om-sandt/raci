const db = require('../config/db');

async function testEventApprovalFix() {
  try {
    console.log('=== TESTING EVENT APPROVAL FIX ===');
    
    // 1. Check current events and their approval status
    console.log('\n1. Checking current events:');
    const eventsQuery = `
      SELECT e.event_id, e.name, e.department_id, e.hod_id, e.approval_status, e.created_at,
             d.name as dept_name, u.full_name as hod_name
      FROM events e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN users u ON e.hod_id = u.user_id
      ORDER BY e.created_at DESC
      LIMIT 5
    `;
    const eventsResult = await db.query(eventsQuery);
    console.log('Recent events:', eventsResult.rows);
    
    // 2. Check departments with HODs
    console.log('\n2. Checking departments with HODs:');
    const deptQuery = `
      SELECT d.department_id, d.name, d.hod_id, u.full_name as hod_name
      FROM departments d
      LEFT JOIN users u ON d.hod_id = u.user_id
      WHERE d.hod_id IS NOT NULL
    `;
    const deptResult = await db.query(deptQuery);
    console.log('Departments with HODs:', deptResult.rows);
    
    if (deptResult.rows.length === 0) {
      console.log('❌ No departments found with HODs assigned!');
      return;
    }
    
    // 3. Test HOD dashboard query for each department
    console.log('\n3. Testing HOD dashboard queries:');
    for (const dept of deptResult.rows) {
      const hodDashboardQuery = `
        SELECT event_id, name, approval_status, created_at
        FROM events
        WHERE department_id = $1 AND approval_status = 'pending'
        ORDER BY created_at ASC
      `;
      const hodResult = await db.query(hodDashboardQuery, [dept.department_id]);
      console.log(`Department ${dept.name} (HOD: ${dept.hod_name}):`, hodResult.rows);
    }
    
    // 4. Test creating a new event (if we have a department with HOD)
    if (deptResult.rows.length > 0) {
      const testDept = deptResult.rows[0];
      console.log(`\n4. Testing event creation for department: ${testDept.name}`);
      
      // Create a test event
      const createEventQuery = `
        INSERT INTO events (name, description, department_id, hod_id, created_by, approval_status)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING event_id, name, approval_status, created_at
      `;
      
      const testEventResult = await db.query(createEventQuery, [
        'Test Event for Approval',
        'This is a test event to verify approval flow',
        testDept.department_id,
        testDept.hod_id,
        testDept.hod_id, // Using HOD as creator for test
        'pending'
      ]);
      
      console.log('Created test event:', testEventResult.rows[0]);
      
      // Check if it appears in HOD dashboard
      const checkHodQuery = `
        SELECT event_id, name, approval_status, created_at
        FROM events
        WHERE department_id = $1 AND approval_status = 'pending'
        ORDER BY created_at ASC
      `;
      const checkResult = await db.query(checkHodQuery, [testDept.department_id]);
      console.log('Events in HOD dashboard after creation:', checkResult.rows);
      
      // Clean up - delete the test event
      await db.query('DELETE FROM events WHERE event_id = $1', [testEventResult.rows[0].event_id]);
      console.log('Test event cleaned up');
    }
    
    console.log('\n=== TEST COMPLETE ===');
    
  } catch (error) {
    console.error('Error in test:', error);
  } finally {
    await db.pool.end();
  }
}

testEventApprovalFix(); 