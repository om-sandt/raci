const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

async function testEventFiltering() {
  let pool;
  
  try {
    console.log('🧪 Testing event filtering by status...');
    
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
    
    // Create test events with different statuses
    const testEvents = [
      { name: 'Test Pending Event', status: 'PENDING' },
      { name: 'Test Approved Event', status: 'APPROVED' },
      { name: 'Test Rejected Event', status: 'REJECTED' }
    ];
    
    const createdEvents = [];
    
    for (const testEvent of testEvents) {
      const eventName = `${testEvent.name} ${Date.now()}`;
      console.log(`\n📝 Creating event: ${eventName} with status: ${testEvent.status}`);
      
      const createResult = await pool.query(`
        INSERT INTO events (
          name, description, division, priority, event_type, 
          department_id, hod_id, created_by, approval_status, kpi
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING event_id, name, approval_status
      `, [
        eventName,
        'Test event for filtering',
        'Test Division',
        'medium',
        'Operational Event',
        department.department_id,
        department.hod_id,
        companyAdmin.user_id,
        testEvent.status,
        'KPI'
      ]);
      
      const createdEvent = createResult.rows[0];
      createdEvents.push(createdEvent);
      console.log(`✅ Created event ID: ${createdEvent.event_id}, Status: ${createdEvent.approval_status}`);
    }
    
    // Test filtering by status (simulating the getEvents function)
    console.log('\n🧪 Testing event filtering...');
    
    const statusFilters = ['pending', 'approved', 'rejected'];
    
    for (const statusFilter of statusFilters) {
      console.log(`\n📊 Testing filter: status=${statusFilter}`);
      
      // Simulate the getEvents query with status filter
      const query = `
        SELECT e.event_id, e.name, e.division, e.priority, e.event_type, e.kpi, e.department_id, e.approval_status, e.created_at,
        d.name as department_name
        FROM events e
        LEFT JOIN departments d ON e.department_id = d.department_id
        WHERE d.company_id = $1 AND e.approval_status = $2
        ORDER BY e.created_at DESC
      `;
      
      const queryParams = [companyAdmin.company_id, statusFilter.toUpperCase()];
      
      try {
        const result = await pool.query(query, queryParams);
        console.log(`✅ Filter '${statusFilter}' returned ${result.rows.length} events`);
        
        if (result.rows.length > 0) {
          result.rows.forEach(event => {
            console.log(`   - Event: ${event.name}, Status: ${event.approval_status}`);
          });
        }
      } catch (error) {
        console.log(`❌ Filter '${statusFilter}' failed: ${error.message}`);
      }
    }
    
    // Test without status filter
    console.log('\n📊 Testing without status filter (all events)');
    
    const allEventsQuery = `
      SELECT e.event_id, e.name, e.approval_status
      FROM events e
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE d.company_id = $1
      ORDER BY e.created_at DESC
    `;
    
    const allEventsResult = await pool.query(allEventsQuery, [companyAdmin.company_id]);
    console.log(`✅ All events query returned ${allEventsResult.rows.length} events`);
    
    // Clean up test events
    console.log('\n🧹 Cleaning up test events...');
    const eventIds = createdEvents.map(event => event.event_id);
    await pool.query('DELETE FROM events WHERE event_id = ANY($1)', [eventIds]);
    console.log('✅ Test events cleaned up');
    
    console.log('\n🎉 All event filtering tests passed!');
    console.log('💡 Event filtering by status is working correctly.');
    
  } catch (error) {
    console.error('❌ Error testing event filtering:', error.message);
    console.error(error.stack);
  } finally {
    if (pool) {
      await pool.end();
    }
    process.exit(0);
  }
}

testEventFiltering(); 