/**
 * Database initialization script
 * Run with: node scripts/initDb.js
 */
const { execSync } = require('child_process');
const path = require('path');
const dotenv = require('dotenv');
const logger = require('../utils/logger');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function initializeDatabase() {
  try {
    logger.info('Initializing database with Prisma...');

    // Generate Prisma client
    logger.info('Generating Prisma client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    // Push schema to database
    logger.info('Pushing schema to database...');
    execSync('npx prisma db push', { stdio: 'inherit' });

    logger.info('Database initialization completed successfully!');
  } catch (error) {
    logger.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase();
