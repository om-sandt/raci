const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function checkApprovalStatusEnum() {
  let pool;
  
  try {
    console.log('🔍 Checking approval_status column definition...');
    
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
    
    // Check the column definition
    const columnResult = await pool.query(`
      SELECT 
        column_name,
        data_type,
        udt_name,
        is_nullable,
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'events' 
      AND column_name = 'approval_status'
    `);
    
    if (columnResult.rows.length === 0) {
      console.log('❌ approval_status column not found');
      return;
    }
    
    const column = columnResult.rows[0];
    console.log('📊 Column definition:');
    console.log(`   Column name: ${column.column_name}`);
    console.log(`   Data type: ${column.data_type}`);
    console.log(`   UDT name: ${column.udt_name}`);
    console.log(`   Is nullable: ${column.is_nullable}`);
    console.log(`   Default: ${column.column_default}`);
    console.log(`   Max length: ${column.character_maximum_length}`);
    
    // Check if it's an enum type
    if (column.udt_name && column.udt_name !== column.data_type) {
      console.log('\n🔍 This appears to be an enum type. Checking enum values...');
      
      const enumResult = await pool.query(`
        SELECT enumlabel
        FROM pg_enum
        WHERE enumtypid = (
          SELECT oid 
          FROM pg_type 
          WHERE typname = $1
        )
        ORDER BY enumsortorder
      `, [column.udt_name]);
      
      if (enumResult.rows.length > 0) {
        console.log('📊 Valid enum values:');
        enumResult.rows.forEach((row, index) => {
          console.log(`   ${index + 1}. ${row.enumlabel}`);
        });
      } else {
        console.log('❌ No enum values found');
      }
    }
    
    // Check the table constraint
    const constraintResult = await pool.query(`
      SELECT 
        conname,
        pg_get_constraintdef(oid) as constraint_definition
      FROM pg_constraint 
      WHERE conrelid = (
        SELECT oid 
        FROM pg_class 
        WHERE relname = 'events'
      )
      AND contype = 'c'
    `);
    
    console.log('\n📊 Table constraints:');
    if (constraintResult.rows.length === 0) {
      console.log('   No constraints found');
    } else {
      constraintResult.rows.forEach(constraint => {
        console.log(`   ${constraint.conname}: ${constraint.constraint_definition}`);
      });
    }
    
    // Try to insert with different values to see what works
    console.log('\n🧪 Testing different values...');
    const testValues = ['pending', 'approved', 'rejected', 'not_send_for_approval', 'draft'];
    
    for (const value of testValues) {
      try {
        const testName = `Test Event ${value} ${Date.now()}`;
        await pool.query(`
          INSERT INTO events (
            name, description, department_id, created_by, approval_status
          ) VALUES ($1, $2, $3, $4, $5)
        `, [testName, 'Test', 1, 2, value]);
        
        console.log(`✅ Value '${value}' works`);
        
        // Clean up
        await pool.query('DELETE FROM events WHERE name = $1', [testName]);
      } catch (error) {
        console.log(`❌ Value '${value}' failed: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking approval status enum:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

checkApprovalStatusEnum(); 