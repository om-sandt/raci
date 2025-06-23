const express = require('express');
const {
  createDepartment,
  getAllDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment
} = require('../controllers/departmentController');
const { protect, authorize, checkCompanyMember } = require('../middleware/auth');
const logger = require('../utils/logger');

// Router for company departments
const companyDepartmentsRouter = express.Router({ mergeParams: true });

// Debug middleware to log the params
companyDepartmentsRouter.use((req, res, next) => {
  logger.debug(`Department route params: ${JSON.stringify(req.params)}`);
  next();
});

// Apply authentication middleware to all routes
companyDepartmentsRouter.use(protect);

// Routes for /api/companies/:companyId/departments
companyDepartmentsRouter
  .route('/')
  .get(checkCompanyMember, getAllDepartments)
  .post(authorize('company_admin'), checkCompanyMember, createDepartment);

// Router for departments
const departmentRouter = express.Router();

// Debug middleware to log the params
departmentRouter.use((req, res, next) => {
  logger.debug(`Department route params: ${JSON.stringify(req.params)}`);
  next();
});

// Apply authentication middleware to all routes
departmentRouter.use(protect);

// Routes for /api/departments/:id
departmentRouter
  .route('/:id')
  .get(getDepartmentById)
  .put(authorize('company_admin'), updateDepartment)
  .delete(authorize('company_admin'), deleteDepartment);

module.exports = { 
  companyDepartmentsRouter,
  departmentRouter
};
