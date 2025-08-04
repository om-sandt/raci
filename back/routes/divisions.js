const express = require('express');
const router = express.Router();
const divisionController = require('../controllers/divisionController');
const { protect, authorize } = require('../middleware/auth');

// All routes require authentication and company_admin role
router.use(protect);
router.use(authorize('company_admin', 'website_admin'));

router.get('/', divisionController.getAllDivisions);
router.get('/:id', divisionController.getDivisionById);
router.post('/', divisionController.createDivision);
router.put('/:id', divisionController.updateDivision);
router.delete('/:id', divisionController.deleteDivision);

module.exports = router; 