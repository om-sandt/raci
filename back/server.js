const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const errorHandler = require('./middleware/errorHandler');
const requestLogger = require('./middleware/requestLogger');
const logger = require('./utils/logger');
const { runSeeders } = require('./utils/dbSeeders');
const prisma = require('./lib/prisma');
const corsOptions = require('./config/corsConfig');

// Load env vars
dotenv.config();

// Initialize app
const app = express();

// Apply CORS to all routes with our configuration
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup request logger - must be after body parsers but before routes
app.use(requestLogger);

// Create uploads directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

// Route to serve S3 files through /uploads/ path (must come before static route)
app.get('/uploads/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Check if file exists locally first
    const localPath = path.join(__dirname, 'uploads', filename);
    if (fs.existsSync(localPath)) {
      return res.sendFile(localPath);
    }
    
    // If not found locally, try to find it in S3
    const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
    });
    
    // Search for the file in S3 by filename
    // We'll need to list objects and find the one with matching filename
    const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: 'raci/'
    });
    
    const listResult = await s3Client.send(listCommand);
    const fileKey = listResult.Contents?.find(obj => 
      obj.Key && obj.Key.split('/').pop() === filename
    )?.Key;
    
    if (!fileKey) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // Get the file from S3 and stream it
    const getCommand = new GetObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: fileKey
    });
    
    const s3Response = await s3Client.send(getCommand);
    
    // Set appropriate headers
    res.setHeader('Content-Type', s3Response.ContentType || 'application/octet-stream');
    res.setHeader('Content-Length', s3Response.ContentLength);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    // Stream the file
    s3Response.Body.pipe(res);
    
  } catch (error) {
    console.error('Error serving file from S3:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// Set static folder for uploads (fallback for local files)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount routers
const mountRouter = (path, router) => {
  app.use(path, router);
};

// Mount all routers
mountRouter('/api/auth', require('./routes/auth'));
mountRouter('/api/users', require('./routes/users'));
mountRouter('/api/companies', require('./routes/companies'));
mountRouter('/api/companies/:companyId/departments', require('./routes/departments').companyDepartmentsRouter);
mountRouter('/api/departments', require('./routes/departments').departmentRouter);
mountRouter('/api/events', require('./routes/events'));
mountRouter('/api/raci', require('./routes/raci'));
mountRouter('/api/meetings', require('./routes/meetings'));
mountRouter('/api/dashboard', require('./routes/dashboard'));
mountRouter('/api/website-admins', require('./routes/websiteAdmins'));
mountRouter('/api/user-raci', require('./routes/userRaci'));
mountRouter('/api/hod', require('./routes/hod'));
mountRouter('/api/designations', require('./routes/designations'));
mountRouter('/api/locations', require('./routes/locations'));
mountRouter('/api/raci-tracker', require('./routes/raciTracker'));
mountRouter('/api/divisions', require('./routes/divisions'));

// Basic route with CORS
app.get('/', (req, res) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.json({
    success: true,
    message: 'RACI SaaS Platform API is running'
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize database and run seeders before starting the server
const startServer = async () => {
  try {
    // Connect to database and validate connection
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database via Prisma');
    
    // Run seeders
    await runSeeders();
    
    // Start server
    const PORT = process.env.PORT || 9100;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    console.error('Failed to start server:', error);
    process.exit(1);
  } finally {
    // Add a graceful shutdown to disconnect Prisma
    process.on('SIGINT', async () => {
      await prisma.$disconnect();
      logger.info('Disconnected from database');
      process.exit(0);
    });
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Promise Rejection: ${err.message}`);
  logger.error(err.stack);
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  logger.error(err.stack);
  console.error(`Error: ${err.message}`);
  // Close server & exit process
  process.exit(1);
});
