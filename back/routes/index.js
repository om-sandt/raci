const express = require('express');
const authRoutes = require('./auth');
const userRoutes = require('./users');
const companyRoutes = require('./companies');
const { companyDepartmentsRouter, departmentRouter } = require('./departments');
const eventRoutes = require('./events');
const raciRoutes = require('./raci');
const meetingRoutes = require('./meetings');
const dashboardRoutes = require('./dashboard');
const websiteAdminRoutes = require('./websiteAdmins');
const userRaciRoutes = require('./userRaciRoutes');
const raciTrackerRoutes = require('./raciTracker');
const hodRoutes = require('./hod');
const designationRoutes = require('./designations');
const locationRoutes = require('./locations');
const logger = require('../utils/logger');

const router = express.Router();

// Debug middleware
router.use((req, res, next) => {
  logger.debug(`API Request: ${req.method} ${req.originalUrl}`);
  next();
});

// Mount routers
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/companies', companyRoutes);
// Use the proper way to mount sub-routers with params
router.use('/companies/:companyId/departments', companyDepartmentsRouter);
router.use('/departments', departmentRouter);
router.use('/events', eventRoutes);
router.use('/raci', raciRoutes);
router.use('/meetings', meetingRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/website-admins', websiteAdminRoutes);
router.use('/user-raci', userRaciRoutes);
router.use('/raci-tracker', raciTrackerRoutes);
router.use('/hod', hodRoutes);
router.use('/designations', designationRoutes);
router.use('/locations', locationRoutes);

module.exports = router;
