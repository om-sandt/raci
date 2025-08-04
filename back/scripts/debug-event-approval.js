const db = require('../config/db');

async function debugEventApproval() {
  try {
    console.log('=== DEBUG: Event Approval Flow ===');
    
    // 1. Check if there are any departments with HODs
    console.log('\n1. Checking departments with HODs:');
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
    
    // 2. Check recent events
    console.log('\n2. Checking recent events:');
    const eventsQuery = `
      SELECT e.event_id, e.name, e.department_id, e.hod_id, e.approval_status, e.created_at,
             d.name as dept_name, u.full_name as hod_name
      FROM events e
      LEFT JOIN departments d ON e.department_id = d.department_id
      LEFT JOIN users u ON e.hod_id = u.user_id
      ORDER BY e.created_at DESC
      LIMIT 10
    `;
    const eventsResult = await db.query(eventsQuery);
    console.log('Recent events:', eventsResult.rows);
    
    // 3. Check pending events for each department
    console.log('\n3. Checking pending events by department:');
    for (const dept of deptResult.rows) {
      const pendingQuery = `
        SELECT e.event_id, e.name, e.approval_status, e.created_at
        FROM events e
        WHERE e.department_id = $1 AND e.approval_status = 'PENDING'
        ORDER BY e.created_at ASC
      `;
      const pendingResult = await db.query(pendingQuery, [dept.department_id]);
      console.log(`Department ${dept.name} (HOD: ${dept.hod_name}):`, pendingResult.rows);
    }
    
    // 4. Test HOD dashboard query for first department with HOD
    if (deptResult.rows.length > 0) {
      const testDept = deptResult.rows[0];
      console.log(`\n4. Testing HOD dashboard query for department: ${testDept.name}`);
      
      const hodDashboardQuery = `
        SELECT event_id, name, created_at
        FROM events
        WHERE department_id = $1 AND approval_status = 'PENDING'
        ORDER BY created_at ASC
      `;
      const hodResult = await db.query(hodDashboardQuery, [testDept.department_id]);
      console.log('HOD Dashboard pending approvals:', hodResult.rows);
    }
    
    console.log('\n=== DEBUG COMPLETE ===');
    
  } catch (error) {
    console.error('Error in debug:', error);
  } finally {
    // Close the pool properly
    await db.pool.end();
  }
}

debugEventApproval(); 