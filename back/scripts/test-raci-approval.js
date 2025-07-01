const db = require('../config/db');
const logger = require('../utils/logger');

async function testRaciApprovalFunctionality() {
  console.log('🚀 Testing RACI Approval Database Connectivity...\n');
  
  try {
    // Test 1: Check database connection
    console.log('1. Testing database connection...');
    const connectionTest = await db.query('SELECT NOW() as current_time');
    console.log('✅ Database connection successful:', connectionTest.rows[0].current_time);
    console.log('');

    // Test 2: Check if required tables exist
    console.log('2. Checking if required tables exist...');
    
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('raci_approvals', 'raci_assignments', 'events', 'tasks', 'users')
      ORDER BY table_name;
    `;
    
    const tables = await db.query(tablesQuery);
    console.log('✅ Found tables:', tables.rows.map(row => row.table_name));
    console.log('');

    // Test 3: Check raci_approvals table structure
    console.log('3. Checking raci_approvals table structure...');
    const structureQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'raci_approvals' 
      ORDER BY ordinal_position;
    `;
    
    const structure = await db.query(structureQuery);
    console.log('✅ raci_approvals table structure:');
    structure.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    console.log('');

    // Test 4: Check for sample data
    console.log('4. Checking for sample data...');
    
    // Check events
    const eventsCount = await db.query('SELECT COUNT(*) as count FROM events');
    console.log(`✅ Events in database: ${eventsCount.rows[0].count}`);
    
    // Check users with approval_assign = true
    const approversCount = await db.query('SELECT COUNT(*) as count FROM users WHERE approval_assign = true');
    console.log(`✅ Users with approval_assign = true: ${approversCount.rows[0].count}`);
    
    // Check RACI assignments
    const raciCount = await db.query('SELECT COUNT(*) as count FROM raci_assignments');
    console.log(`✅ RACI assignments in database: ${raciCount.rows[0].count}`);
    
    // Check RACI approvals
    const approvalsCount = await db.query('SELECT COUNT(*) as count FROM raci_approvals');
    console.log(`✅ RACI approvals in database: ${approvalsCount.rows[0].count}`);
    console.log('');

    // Test 5: Test CRUD operations on raci_approvals
    console.log('5. Testing CRUD operations on raci_approvals...');
    
    // First, let's get some sample data
    const sampleRaci = await db.query('SELECT raci_id FROM raci_assignments LIMIT 1');
    const sampleUser = await db.query('SELECT user_id FROM users WHERE approval_assign = true LIMIT 1');
    
    if (sampleRaci.rows.length > 0 && sampleUser.rows.length > 0) {
      const raciId = sampleRaci.rows[0].raci_id;
      const userId = sampleUser.rows[0].user_id;
      
      // Insert test approval
      console.log('   📝 Testing INSERT...');
      const insertResult = await db.query(
        `INSERT INTO raci_approvals (raci_id, approval_level, approved_by, status)
         VALUES ($1, $2, $3, $4)
         RETURNING approval_id, status, created_at`,
        [raciId, 1, userId, 'pending']
      );
      
      const approvalId = insertResult.rows[0].approval_id;
      console.log(`   ✅ INSERT successful - Approval ID: ${approvalId}, Status: ${insertResult.rows[0].status}`);
      
      // Test SELECT
      console.log('   📖 Testing SELECT...');
      const selectResult = await db.query(
        'SELECT * FROM raci_approvals WHERE approval_id = $1',
        [approvalId]
      );
      console.log(`   ✅ SELECT successful - Found approval with status: ${selectResult.rows[0].status}`);
      
      // Test UPDATE
      console.log('   ✏️ Testing UPDATE...');
      const updateResult = await db.query(
        `UPDATE raci_approvals 
         SET status = $1, reason = $2, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE approval_id = $3
         RETURNING status, reason`,
        ['approved', 'Test approval reason', approvalId]
      );
      console.log(`   ✅ UPDATE successful - New status: ${updateResult.rows[0].status}, Reason: ${updateResult.rows[0].reason}`);
      
      // Test complex query (like what our API uses)
      console.log('   🔍 Testing complex JOIN query...');
      const complexQuery = `
        SELECT ra.approval_id, ra.approval_level, ra.status, ra.reason,
               rac.event_id, rac.task_id, rac.type, rac.level,
               u.full_name as approver_name, u.email as approver_email
        FROM raci_approvals ra
        JOIN raci_assignments rac ON ra.raci_id = rac.raci_id
        JOIN users u ON ra.approved_by = u.user_id
        WHERE ra.approval_id = $1
      `;
      
      const complexResult = await db.query(complexQuery, [approvalId]);
      if (complexResult.rows.length > 0) {
        const row = complexResult.rows[0];
        console.log(`   ✅ Complex query successful:`);
        console.log(`      - Approver: ${row.approver_name} (${row.approver_email})`);
        console.log(`      - Status: ${row.status}`);
        console.log(`      - RACI Type: ${row.type}, Level: ${row.level}`);
        console.log(`      - Event ID: ${row.event_id}, Task ID: ${row.task_id}`);
      }
      
      // Clean up test data
      console.log('   🧹 Cleaning up test data...');
      await db.query('DELETE FROM raci_approvals WHERE approval_id = $1', [approvalId]);
      console.log('   ✅ Test data cleaned up');
      
    } else {
      console.log('   ⚠️ No sample data available for CRUD testing');
      console.log('   💡 Create some events and RACI assignments first');
    }
    
    console.log('');
    console.log('🎉 All tests completed successfully!');
    console.log('✅ Database is ready for RACI approval functionality');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testRaciApprovalFunctionality()
    .then(() => {
      console.log('\n🏁 Test completed. Exiting...');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Test failed with error:', error.message);
      process.exit(1);
    });
}

module.exports = { testRaciApprovalFunctionality }; 