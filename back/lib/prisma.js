const { PrismaClient } = require('@prisma/client');

// Create a singleton instance of the Prisma client
const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Save the client instance in global object to prevent multiple instances in dev mode
if (process.env.NODE_ENV === 'development') {
  global.prisma = prisma;
}

module.exports = prisma;
