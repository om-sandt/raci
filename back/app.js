const express = require('express');
const router = express.Router();

// Middleware to check authentication and authorization
const { authenticateJWT, authorizeRole } = require('../middleware/authMiddleware');

// Controller methods
const {
  getCompanyRaciAssignments,
  getMyRaciAssignments
} = require('../controllers/raciTrackerController');

// Routes
router.get('/company', authenticateJWT, authorizeRole('company_admin'), getCompanyRaciAssignments);
router.get('/my-assignments', authenticateJWT, getMyRaciAssignments);

module.exports = router;

const raciTrackerRoutes = require('./routes/raciTracker');
const userRaciRoutes = require('./routes/userRaciRoutes');
app.use('/api/raci-tracker', raciTrackerRoutes);
app.use('/api/raci/tracker', (req, res) => {
  res.redirect(`/api/raci-tracker${req.path === '/' ? '/my-assignments' : req.path}`);
});

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

app.use((req, res, next) => {
  console.log(`Request: ${req.method} ${req.path} not found`);
  next();
});

// Add a catch-all route to help debug 404s
app.use('*', (req, res) => {
  console.log(`Route not found: ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl
  });
});

console.log('RACI Tracker routes imported');
app.use('/api/raci-tracker', raciTrackerRoutes);
console.log('RACI Tracker routes registered at: /api/raci-tracker');

// Debug route to check if Express is working
app.get('/api/debug', (req, res) => {
  res.status(200).json({ success: true, message: 'API is working' });
});