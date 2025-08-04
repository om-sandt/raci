const db = require('../config/db');

async function fixApprovalStatusCase() {
  try {
    console.log('=== FIXING APPROVAL STATUS CASE SENSITIVITY ===');
    
    // 1. Check current approval status values
    console.log('\n1. Checking current approval status values:');
    const checkQuery = `
      SELECT approval_status, COUNT(*) as count
      FROM events
      GROUP BY approval_status
    `;
    const checkResult = await db.query(checkQuery);
    console.log('Current approval status distribution:', checkResult.rows);
    
    // 2. Fix uppercase values to lowercase
    console.log('\n2. Fixing uppercase approval status values...');
    
    // Fix PENDING to pending
    const fixPendingResult = await db.query(`
      UPDATE events 
      SET approval_status = 'pending' 
      WHERE approval_status = 'PENDING'
    `);
    console.log(`Fixed ${fixPendingResult.rowCount} events with 'PENDING' status`);
    
    // Fix APPROVED to approved
    const fixApprovedResult = await db.query(`
      UPDATE events 
      SET approval_status = 'approved' 
      WHERE approval_status = 'APPROVED'
    `);
    console.log(`Fixed ${fixApprovedResult.rowCount} events with 'APPROVED' status`);
    
    // Fix REJECTED to rejected
    const fixRejectedResult = await db.query(`
      UPDATE events 
      SET approval_status = 'rejected' 
      WHERE approval_status = 'REJECTED'
    `);
    console.log(`Fixed ${fixRejectedResult.rowCount} events with 'REJECTED' status`);
    
    // 3. Verify the fix
    console.log('\n3. Verifying the fix:');
    const verifyResult = await db.query(checkQuery);
    console.log('Updated approval status distribution:', verifyResult.rows);
    
    // 4. Test HOD dashboard query
    console.log('\n4. Testing HOD dashboard query:');
    const hodTestQuery = `
      SELECT d.name as department_name, COUNT(e.event_id) as pending_events
      FROM departments d
      LEFT JOIN events e ON d.department_id = e.department_id AND e.approval_status = 'pending'
      WHERE d.hod_id IS NOT NULL
      GROUP BY d.department_id, d.name
    `;
    const hodTestResult = await db.query(hodTestQuery);
    console.log('HOD departments with pending events:', hodTestResult.rows);
    
    console.log('\n=== FIX COMPLETE ===');
    
  } catch (error) {
    console.error('Error in fix:', error);
  } finally {
    await db.pool.end();
  }
}

fixApprovalStatusCase(); 