/**
 * This script verifies the database schema for raci_assignments table
 * to ensure it's correctly configured
 */
const db = require('../config/db');
const logger = require('../utils/logger');

async function verifyRaciAssignmentsSchema() {
  try {
    console.log('Verifying RACI assignments table schema...');
    
    // Check if the table exists and get column information
    const tableInfo = await db.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'raci_assignments'
    `);
    
    console.log('RACI Assignments table schema:');
    tableInfo.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    });
    
    // Specifically check financial limit columns
    const financialColumns = tableInfo.rows.filter(col => 
      col.column_name === 'financial_limit_min' || col.column_name === 'financial_limit_max'
    );
    
    if (financialColumns.length === 2) {
      console.log('\nFinancial limit columns look good!');
    } else {
      console.log('\nWarning: Financial limit columns not found as expected!');
    }
  } catch (error) {
    console.error('Error verifying schema:', error);
  } finally {
    process.exit(0);
  }
}

// Run the verification
verifyRaciAssignmentsSchema();
