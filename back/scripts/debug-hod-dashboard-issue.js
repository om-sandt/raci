const db = require('../config/db');

async function debugHodDashboardIssue() {
  try {
    console.log('=== DEBUGGING HOD DASHBOARD ISSUE ===');
    
    // 1. Check all events in the database
    console.log('\n1. Checking all events in database:');
    const allEventsQuery = `
      SELECT e.event_id, e.name, e.department_id, e.hod_id, e.approval_status, e.created_at,
             d.name as dept_name, u.full_name as hod_name, c.full_name as creator_name
      FROM events e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN users u ON e.hod_id = u.user_id
      LEFT JOIN users c ON e.created_by = c.user_id
      ORDER BY e.created_at DESC
    `;
    const allEventsResult = await db.query(allEventsQuery);
    console.log('All events:', allEventsResult.rows);
    
    // 2. Check departments and their HODs
    console.log('\n2. Checking departments and HODs:');
    const deptQuery = `
      SELECT d.department_id, d.name, d.hod_id, u.full_name as hod_name, c.name as company_name
      FROM departments d
      LEFT JOIN users u ON d.hod_id = u.user_id
      LEFT JOIN companies c ON d.company_id = c.company_id
      ORDER BY d.department_id
    `;
    const deptResult = await db.query(deptQuery);
    console.log('Departments:', deptResult.rows);
    
    // 3. Check events by approval status
    console.log('\n3. Checking events by approval status:');
    const statusQuery = `
      SELECT approval_status, COUNT(*) as count
      FROM events
      GROUP BY approval_status
    `;
    const statusResult = await db.query(statusQuery);
    console.log('Events by status:', statusResult.rows);
    
    // 4. Check events by department
    console.log('\n4. Checking events by department:');
    const deptEventsQuery = `
      SELECT d.name as dept_name, e.approval_status, COUNT(*) as count
      FROM events e
      JOIN departments d ON e.department_id = d.department_id
      GROUP BY d.name, e.approval_status
      ORDER BY d.name, e.approval_status
    `;
    const deptEventsResult = await db.query(deptEventsQuery);
    console.log('Events by department and status:', deptEventsResult.rows);
    
    // 5. Test HOD dashboard query for each department with HOD
    console.log('\n5. Testing HOD dashboard queries:');
    for (const dept of deptResult.rows) {
      if (dept.hod_id) {
        console.log(`\n--- Testing for Department: ${dept.name} (HOD: ${dept.hod_name}) ---`);
        
        // Test the exact HOD dashboard query
        const hodDashboardQuery = `
          SELECT event_id, name, approval_status, created_at
          FROM events
          WHERE department_id = $1 AND approval_status = 'PENDING'
          ORDER BY created_at ASC
        `;
        const hodResult = await db.query(hodDashboardQuery, [dept.department_id]);
        console.log(`Events with PENDING status in ${dept.name}:`, hodResult.rows);
        
        // Test with different case variations
        const pendingLowerQuery = `
          SELECT event_id, name, approval_status, created_at
          FROM events
          WHERE department_id = $1 AND approval_status = 'pending'
          ORDER BY created_at ASC
        `;
        const pendingLowerResult = await db.query(pendingLowerQuery, [dept.department_id]);
        console.log(`Events with 'pending' (lowercase) in ${dept.name}:`, pendingLowerResult.rows);
        
        // Check all events in this department
        const allDeptEventsQuery = `
          SELECT event_id, name, approval_status, created_at
          FROM events
          WHERE department_id = $1
          ORDER BY created_at ASC
        `;
        const allDeptEventsResult = await db.query(allDeptEventsQuery, [dept.department_id]);
        console.log(`All events in ${dept.name}:`, allDeptEventsResult.rows);
      }
    }
    
    // 6. Check if there are any events that should be pending but aren't showing up
    console.log('\n6. Checking for potential issues:');
    
    // Check events with null approval_status
    const nullStatusQuery = `
      SELECT event_id, name, department_id, approval_status
      FROM events
      WHERE approval_status IS NULL
    `;
    const nullStatusResult = await db.query(nullStatusQuery);
    console.log('Events with NULL approval_status:', nullStatusResult.rows);
    
    // Check events with empty approval_status
    const emptyStatusQuery = `
      SELECT event_id, name, department_id, approval_status
      FROM events
      WHERE approval_status = ''
    `;
    const emptyStatusResult = await db.query(emptyStatusQuery);
    console.log('Events with empty approval_status:', emptyStatusResult.rows);
    
    // 7. Test creating a new event to see if it works
    console.log('\n7. Testing event creation:');
    if (deptResult.rows.length > 0) {
      const testDept = deptResult.rows.find(d => d.hod_id);
      if (testDept) {
        console.log(`Creating test event for department: ${testDept.name}`);
        
        const createEventQuery = `
          INSERT INTO events (name, description, department_id, hod_id, created_by, approval_status)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING event_id, name, approval_status, created_at
        `;
        
        const testEventResult = await db.query(createEventQuery, [
          'DEBUG TEST EVENT',
          'This is a test event to debug HOD dashboard',
          testDept.department_id,
          testDept.hod_id,
          testDept.hod_id,
          'PENDING'
        ]);
        
        console.log('Created test event:', testEventResult.rows[0]);
        
        // Check if it appears in HOD dashboard
        const checkHodQuery = `
          SELECT event_id, name, approval_status, created_at
          FROM events
          WHERE department_id = $1 AND approval_status = 'PENDING'
          ORDER BY created_at ASC
        `;
        const checkResult = await db.query(checkHodQuery, [testDept.department_id]);
        console.log('Events in HOD dashboard after creation:', checkResult.rows);
        
        // Clean up
        await db.query('DELETE FROM events WHERE event_id = $1', [testEventResult.rows[0].event_id]);
        console.log('Test event cleaned up');
      }
    }
    
    console.log('\n=== DEBUG COMPLETE ===');
    
  } catch (error) {
    console.error('Error in debug:', error);
  } finally {
    await db.pool.end();
  }
}

debugHodDashboardIssue(); 