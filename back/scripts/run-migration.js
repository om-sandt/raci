const db = require('../config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('Running migration to add company_id columns...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../db/migrate_add_company_id_to_designations.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await db.query(migrationSQL);
    
    console.log('Migration completed successfully!');
    
    // Verify the columns were added
    const designationsCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'designations' 
      AND column_name = 'company_id'
    `);
    
    const locationsCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'locations' 
      AND column_name = 'company_id'
    `);
    
    const divisionsCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'divisions' 
      AND column_name = 'company_id'
    `);
    
    console.log('Verification results:');
    console.log('- designations.company_id:', designationsCheck.rows.length > 0 ? 'EXISTS' : 'MISSING');
    console.log('- locations.company_id:', locationsCheck.rows.length > 0 ? 'EXISTS' : 'MISSING');
    console.log('- divisions.company_id:', divisionsCheck.rows.length > 0 ? 'EXISTS' : 'MISSING');
    
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    process.exit(0);
  }
}

runMigration(); 