const express = require('express');
const router = express.Router();
const db = require('../db');

// Add some sample RACI data
router.get('/add-sample-raci', async (req, res) => {
  try {
    // Add sample data
    await db.query(
      `INSERT INTO raci_assignments (user_id, task_id, event_id, role, financial_limits)
       VALUES ($1, $2, $3, $4, $5)`,
      [1, 1, 1, 'R', JSON.stringify({ min: 1000, max: 5000 })]
    );
    
    res.status(200).json({
      success: true,
      message: 'Sample RACI data added'
    });
  } catch (error) {
    console.error('Error adding sample data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add sample data',
      error: error.message
    });
  }
});

module.exports = router;
