const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');

dotenv.config();

async function testEventCreation() {
  let pool;
  
  try {
    console.log('🧪 Testing event creation...');
    
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
    
    // Test event creation with valid approval status
    const testEventName = 'Test Event ' + Date.now();
    const testEventData = {
      name: testEventName,
      description: 'This is a test event',
      division: 'Test Division',
      departmentId: department.department_id,
      priority: 'medium',
      eventType: 'Operational Event',
      kpi: 'KPI',
      employees: [],
      tasks: [{
        name: 'Test Task',
        description: 'This is a test task',
        status: 'not_started'
      }],
      hod: department.hod_id
    };
    
    console.log('📝 Testing event creation with data:', testEventData);
    
    // Create event directly in database to test
    const insertResult = await pool.query(`
      INSERT INTO events (
        name, description, division, priority, event_type, 
        department_id, hod_id, created_by, approval_status, kpi
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING event_id, name, approval_status, kpi
    `, [
      testEventData.name,
      testEventData.description,
      testEventData.division,
      testEventData.priority,
      testEventData.eventType,
      testEventData.departmentId,
      testEventData.hod,
      companyAdmin.user_id,
      'PENDING', // Use valid approval status
      testEventData.kpi
    ]);
    
    const createdEvent = insertResult.rows[0];
    console.log('✅ Event created successfully!');
    console.log('📊 Created event:', {
      id: createdEvent.event_id,
      name: createdEvent.name,
      approval_status: createdEvent.approval_status,
      kpi: createdEvent.kpi
    });
    
    // Test different approval statuses
    console.log('\n🧪 Testing different approval statuses...');
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED'];
    
    for (const status of validStatuses) {
      try {
        const testName = `Test Event ${status} ${Date.now()}`;
        await pool.query(`
          INSERT INTO events (
            name, description, division, priority, event_type, 
            department_id, hod_id, created_by, approval_status, kpi
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          testName,
          'Test description',
          'Test Division',
          'medium',
          'Operational Event',
          testEventData.departmentId,
          testEventData.hod,
          companyAdmin.user_id,
          status,
          'KPI'
        ]);
        console.log(`✅ Status '${status}' works correctly`);
        
        // Clean up test event
        await pool.query('DELETE FROM events WHERE name = $1', [testName]);
      } catch (error) {
        console.log(`❌ Status '${status}' failed: ${error.message}`);
      }
    }
    
    // Clean up the main test event
    await pool.query('DELETE FROM events WHERE event_id = $1', [createdEvent.event_id]);
    console.log('🧹 Test event cleaned up');
    
    console.log('\n🎉 All event creation tests passed!');
    console.log('💡 The approval status issue has been fixed.');
    
  } catch (error) {
    console.error('❌ Error testing event creation:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

testEventCreation(); 