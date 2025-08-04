const db = require('../config/db');

async function migrateApprovalStatusCase() {
  try {
    console.log('=== MIGRATING APPROVAL STATUS CASE ===');
    
    // 1. Check current approval status values
    console.log('\n1. Checking current approval status values:');
    const checkQuery = `
      SELECT approval_status, COUNT(*) as count
      FROM events
      GROUP BY approval_status
    `;
    const checkResult = await db.query(checkQuery);
    console.log('Current events approval status distribution:', checkResult.rows);
    
    // 2. Update events table approval_status values
    console.log('\n2. Updating events table approval_status values...');
    
    // Update pending to PENDING
    const updatePendingResult = await db.query(`
      UPDATE events 
      SET approval_status = 'PENDING' 
      WHERE approval_status = 'pending'
    `);
    console.log(`Updated ${updatePendingResult.rowCount} events with 'pending' status`);
    
    // Update approved to APPROVED
    const updateApprovedResult = await db.query(`
      UPDATE events 
      SET approval_status = 'APPROVED' 
      WHERE approval_status = 'approved'
    `);
    console.log(`Updated ${updateApprovedResult.rowCount} events with 'approved' status`);
    
    // Update rejected to REJECTED
    const updateRejectedResult = await db.query(`
      UPDATE events 
      SET approval_status = 'REJECTED' 
      WHERE approval_status = 'rejected'
    `);
    console.log(`Updated ${updateRejectedResult.rowCount} events with 'rejected' status`);
    
    // 3. Update raci_approvals table status values
    console.log('\n3. Updating raci_approvals table status values...');
    
    const updateRaciPendingResult = await db.query(`
      UPDATE raci_approvals 
      SET status = 'PENDING' 
      WHERE status = 'pending'
    `);
    console.log(`Updated ${updateRaciPendingResult.rowCount} RACI approvals with 'pending' status`);
    
    const updateRaciApprovedResult = await db.query(`
      UPDATE raci_approvals 
      SET status = 'APPROVED' 
      WHERE status = 'approved'
    `);
    console.log(`Updated ${updateRaciApprovedResult.rowCount} RACI approvals with 'approved' status`);
    
    const updateRaciRejectedResult = await db.query(`
      UPDATE raci_approvals 
      SET status = 'REJECTED' 
      WHERE status = 'rejected'
    `);
    console.log(`Updated ${updateRaciRejectedResult.rowCount} RACI approvals with 'rejected' status`);
    
    // 4. Verify the migration
    console.log('\n4. Verifying the migration:');
    const verifyEventsResult = await db.query(checkQuery);
    console.log('Updated events approval status distribution:', verifyEventsResult.rows);
    
    const verifyRaciQuery = `
      SELECT status, COUNT(*) as count
      FROM raci_approvals
      GROUP BY status
    `;
    const verifyRaciResult = await db.query(verifyRaciQuery);
    console.log('Updated RACI approvals status distribution:', verifyRaciResult.rows);
    
    // 5. Test HOD dashboard query
    console.log('\n5. Testing HOD dashboard query:');
    const hodTestQuery = `
      SELECT d.name as department_name, COUNT(e.event_id) as pending_events
      FROM departments d
      LEFT JOIN events e ON d.department_id = e.department_id AND e.approval_status = 'PENDING'
      WHERE d.hod_id IS NOT NULL
      GROUP BY d.department_id, d.name
    `;
    const hodTestResult = await db.query(hodTestQuery);
    console.log('HOD departments with pending events:', hodTestResult.rows);
    
    console.log('\n=== MIGRATION COMPLETE ===');
    console.log('✅ Approval status case migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error in migration:', error);
  } finally {
    await db.pool.end();
  }
}

migrateApprovalStatusCase(); 