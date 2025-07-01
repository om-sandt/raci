/**
 * Script to create and seed reference tables (locations and designations)
 * Run with: node scripts/createReferenceTables.js
 */
const db = require('../config/db');
const logger = require('../utils/logger');

async function createReferenceTables() {
  try {
    logger.info('Creating reference tables...');

    // Create designations table
    await db.query(`
      CREATE TABLE IF NOT EXISTS designations (
        designation_id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    logger.info('✓ Designations table created');

    // Create locations table
    await db.query(`
      CREATE TABLE IF NOT EXISTS locations (
        location_id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    logger.info('✓ Locations table created');

    // Create indexes
    await db.query(`CREATE INDEX IF NOT EXISTS idx_designations_name ON designations(name);`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_locations_name ON locations(name);`);
    logger.info('✓ Indexes created');

    // Seed designations
    const designations = [
      'Software Engineer',
      'Senior Software Engineer',
      'Team Lead',
      'Project Manager',
      'Product Manager',
      'Business Analyst',
      'Quality Assurance Engineer',
      'DevOps Engineer',
      'Data Analyst',
      'UX/UI Designer',
      'Sales Executive',
      'Marketing Manager',
      'HR Manager',
      'Finance Manager',
      'Operations Manager'
    ];

    for (const designation of designations) {
      await db.query(`
        INSERT INTO designations (name) 
        VALUES ($1) 
        ON CONFLICT DO NOTHING
      `, [designation]);
    }
    logger.info('✓ Designations seeded');

    // Seed locations
    const locations = [
      'New York, USA',
      'Los Angeles, USA',
      'Chicago, USA',
      'Houston, USA',
      'Phoenix, USA',
      'Philadelphia, USA',
      'San Antonio, USA',
      'San Diego, USA',
      'Dallas, USA',
      'San Jose, USA',
      'London, UK',
      'Manchester, UK',
      'Birmingham, UK',
      'Leeds, UK',
      'Glasgow, UK',
      'Mumbai, India',
      'Delhi, India',
      'Bangalore, India',
      'Hyderabad, India',
      'Ahmedabad, India',
      'Chennai, India',
      'Kolkata, India',
      'Pune, India',
      'Jaipur, India',
      'Surat, India'
    ];

    for (const location of locations) {
      await db.query(`
        INSERT INTO locations (name) 
        VALUES ($1) 
        ON CONFLICT DO NOTHING
      `, [location]);
    }
    logger.info('✓ Locations seeded');

    // Check counts
    const designationCount = await db.query('SELECT COUNT(*) as count FROM designations');
    const locationCount = await db.query('SELECT COUNT(*) as count FROM locations');

    logger.info(`✓ Reference tables created successfully!`);
    logger.info(`  - Designations: ${designationCount.rows[0].count} records`);
    logger.info(`  - Locations: ${locationCount.rows[0].count} records`);

  } catch (error) {
    logger.error('Error creating reference tables:', error);
    throw error;
  } finally {
    // Close the database connection
    await db.end();
  }
}

createReferenceTables(); 