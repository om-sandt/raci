const { User, Department, Event, Task, RaciMatrix } = require('../models');

/**
 * Get RACI assignments for a specific user
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} User's RACI assignments
 */
const getUserRaciAssignments = async (userId) => {
  try {
    // Get user with department
    const user = await User.findById(userId).populate('department');
    
    if (!user) {
      throw new Error('User not found');
    }

    // Find all RACI assignments for this user
    const raciAssignments = await RaciMatrix.find({ userId })
      .populate('taskId')
      .populate('eventId');
      
    // Format the response
    const formattedAssignments = raciAssignments.map(assignment => {
      return {
        role: assignment.role, // 'R', 'A', 'C', or 'I'
        task: assignment.taskId,
        event: assignment.eventId,
      };
    });

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      department: user.department ? {
        id: user.department._id,
        name: user.department.name,
      } : null,
      raciAssignments: formattedAssignments,
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  getUserRaciAssignments,
};
