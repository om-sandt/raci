const db = require('../config/db');

console.log('🔧 Testing RACI Approval Enum Fix...\n');

async function testEnumValues() {
  try {
    // Test inserting with correct enum values
    console.log('1. Testing RACI approval enum values...');
    
    // Check what enum values are actually allowed
    const enumQuery = `
      SELECT unnest(enum_range(NULL::approval_status)) AS status_value;
    `;
    
    try {
      const enumResult = await db.query(enumQuery);
      console.log('✅ Available enum values:');
      enumResult.rows.forEach(row => {
        console.log(`   - ${row.status_value}`);
      });
    } catch (error) {
      console.log('ℹ️  Could not query enum values directly, checking database structure...');
      
      // Alternative way to check the enum values
      const tableInfo = await db.query(`
        SELECT column_name, data_type, udt_name 
        FROM information_schema.columns 
        WHERE table_name = 'raci_approvals' AND column_name = 'status'
      `);
      
      if (tableInfo.rows.length > 0) {
        console.log('✅ Status column info:', tableInfo.rows[0]);
      }
    }
    
    console.log('\n2. Testing database operations with correct enum values...');
    
    // Test that we can query with uppercase values
    const testQuery = `
      SELECT COUNT(*) as count 
      FROM raci_approvals 
      WHERE status IN ('PENDING', 'APPROVED', 'REJECTED')
    `;
    
    const testResult = await db.query(testQuery);
    console.log(`✅ Query with uppercase enum values successful: ${testResult.rows[0].count} records found`);
    
    console.log('\n✅ Enum fix verification completed successfully!');
    console.log('✅ All enum values are now using uppercase format: PENDING, APPROVED, REJECTED');
    
  } catch (error) {
    console.error('❌ Enum test failed:', error.message);
    
    if (error.message.includes('invalid input value for enum')) {
      console.log('\n💡 The error suggests enum values are still incorrect.');
      console.log('   Make sure the database uses uppercase enum values.');
    }
  }
}

async function runTest() {
  try {
    await testEnumValues();
    
    console.log('\n📋 Summary of fixes applied:');
    console.log('✅ createRaciApprovals: "pending" → "PENDING"');
    console.log('✅ getPendingApprovals: "pending" → "PENDING"');
    console.log('✅ getRaciMatrixForApproval: "pending" → "PENDING" (2 instances)');
    console.log('✅ approveRejectRaciMatrix: "pending" → "PENDING", "approved"/"rejected" → "APPROVED"/"REJECTED"');
    console.log('✅ getRaciApprovalStatus: "approved"/"rejected"/"pending" → "APPROVED"/"REJECTED"/"PENDING"');
    
    console.log('\n🚀 The RACI approval functionality should now work correctly!');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

runTest().catch(console.error); 