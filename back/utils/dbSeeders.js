const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const logger = require('./logger');

/**
 * Seed the default website admin
 */
const seedDefaultAdmin = async () => {
  try {
    logger.info('Checking for default website admin...');
    
    // Check if there are any admins
    const adminCount = await prisma.websiteAdmin.count();
    
    if (adminCount === 0) {
      logger.info('No website admin found. Creating default admin...');
      
      // Create default admin
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      
      await prisma.websiteAdmin.create({
        data: {
          fullName: 'Om Vataliya',
          email: 'omvataliya23@gmail.com',
          password: hashedPassword,
          phone: '6351497589'
        }
      });
      
      logger.info('Default website admin created successfully!');
    } else {
      logger.info('Website admin already exists. Skipping creation.');
    }
  } catch (error) {
    logger.error('Error seeding default admin:', error);
    throw error;
  }
};

/**
 * Run all seeders
 */
const runSeeders = async () => {
  try {
    logger.info('Running database seeders...');
    
    // Run seeders
    await seedDefaultAdmin();
    
    logger.info('All seeders completed successfully!');
  } catch (error) {
    logger.error('Error running seeders:', error);
    throw error;
  }
};

module.exports = {
  seedDefaultAdmin,
  runSeeders
};
