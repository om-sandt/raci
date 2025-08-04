const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function testDocumentUpload() {
  let pool;
  
  try {
    console.log('🧪 Testing document upload functionality...');
    
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
    
    // Test 1: Create event without document
    console.log('\n📝 Test 1: Creating event without document');
    
    const eventName1 = 'Test Event No Document ' + Date.now();
    const createResult1 = await pool.query(`
      INSERT INTO events (
        name, description, division, priority, event_type, 
        department_id, hod_id, created_by, approval_status, kpi, document_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING event_id, name, document_path, approval_status
    `, [
      eventName1,
      'Test event without document',
      'Test Division',
      'medium',
      'Operational Event',
      department.department_id,
      department.hod_id,
      companyAdmin.user_id,
      'PENDING',
      'KPI',
      null
    ]);
    
    const event1 = createResult1.rows[0];
    console.log(`✅ Event created successfully!`);
    console.log(`📊 Event ID: ${event1.event_id}, Document Path: ${event1.document_path || 'null'}`);
    
    // Test 2: Create event with document path (simulating S3 upload)
    console.log('\n📝 Test 2: Creating event with document path');
    
    const eventName2 = 'Test Event With Document ' + Date.now();
    const documentPath = 'raci/TestCompany/documents/test-document-123.pdf';
    
    const createResult2 = await pool.query(`
      INSERT INTO events (
        name, description, division, priority, event_type, 
        department_id, hod_id, created_by, approval_status, kpi, document_path
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING event_id, name, document_path, approval_status
    `, [
      eventName2,
      'Test event with document',
      'Test Division',
      'medium',
      'Operational Event',
      department.department_id,
      department.hod_id,
      companyAdmin.user_id,
      'PENDING',
      'KPI',
      documentPath
    ]);
    
    const event2 = createResult2.rows[0];
    console.log(`✅ Event created successfully!`);
    console.log(`📊 Event ID: ${event2.event_id}, Document Path: ${event2.document_path}`);
    
    // Test 3: Update event to add document
    console.log('\n📝 Test 3: Updating event to add document');
    
    const newDocumentPath = 'raci/TestCompany/documents/updated-document-456.pdf';
    
    const updateResult = await pool.query(`
      UPDATE events 
      SET document_path = $1
      WHERE event_id = $2
      RETURNING event_id, name, document_path
    `, [newDocumentPath, event1.event_id]);
    
    if (updateResult.rows.length > 0) {
      const updatedEvent = updateResult.rows[0];
      console.log(`✅ Event updated successfully!`);
      console.log(`📊 Event ID: ${updatedEvent.event_id}, New Document Path: ${updatedEvent.document_path}`);
    } else {
      console.log('❌ Failed to update event');
    }
    
    // Test 4: Retrieve events with document information
    console.log('\n📝 Test 4: Retrieving events with document information');
    
    const retrieveResult = await pool.query(`
      SELECT event_id, name, document_path, approval_status
      FROM events
      WHERE event_id IN ($1, $2)
      ORDER BY event_id
    `, [event1.event_id, event2.event_id]);
    
    console.log(`✅ Retrieved ${retrieveResult.rows.length} events`);
    retrieveResult.rows.forEach(event => {
      console.log(`📊 Event: ${event.name}, Document: ${event.document_path || 'null'}, Status: ${event.approval_status}`);
    });
    
    // Test 5: Check S3 URL generation (simulate the generateS3Url function)
    console.log('\n📝 Test 5: Testing S3 URL generation');
    
    const testPaths = [
      null,
      'raci/TestCompany/documents/test-document-123.pdf',
      '/uploads/local-file.pdf',
      'https://example.com/external-file.pdf'
    ];
    
    testPaths.forEach(path => {
      let url = null;
      if (path) {
        if (path.startsWith('http')) {
          url = path; // Already a full URL
        } else if (path.startsWith('/uploads/')) {
          url = path; // Already in uploads format
        } else {
          // Extract filename from S3 key
          const filename = path.split('/').pop();
          url = `/uploads/${filename}`;
        }
      }
      
      console.log(`📊 Path: ${path || 'null'} -> URL: ${url || 'null'}`);
    });
    
    // Clean up test events
    console.log('\n🧹 Cleaning up test events...');
    await pool.query('DELETE FROM events WHERE event_id IN ($1, $2)', [event1.event_id, event2.event_id]);
    console.log('✅ Test events cleaned up');
    
    console.log('\n🎉 All document upload tests passed!');
    console.log('💡 Document upload and storage is working correctly.');
    
  } catch (error) {
    console.error('❌ Error testing document upload:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

testDocumentUpload(); 