const db = require('../config/db');
const logger = require('../utils/logger');

// @desc    Create a new meeting
// @route   POST /api/meetings
// @access  Private (company member)
exports.createMeeting = async (req, res, next) => {
  try {
    const { eventId, title, description, meetingDate, guestUserIds, meetingUrl } = req.body;
    
    // Check if event exists
    const eventCheck = await db.query(
      'SELECT * FROM events WHERE event_id = $1',
      [eventId]
    );
    
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Parse guest user IDs if provided as a string
    let guestIdsString = null;
    if (guestUserIds) {
      if (Array.isArray(guestUserIds)) {
        guestIdsString = guestUserIds.join(',');
      } else {
        guestIdsString = guestUserIds;
      }
    }

    // Create meeting record
    const result = await db.query(
      `INSERT INTO raci_meetings 
       (event_id, title, description, meeting_date, guest_user_ids, meeting_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING meeting_id, event_id, title, description, meeting_date, guest_user_ids, meeting_url, created_at`,
      [eventId, title, description, meetingDate, guestIdsString, meetingUrl]
    );
    
    const meeting = result.rows[0];
    
    // Get event details
    const eventResult = await db.query(
      'SELECT name FROM events WHERE event_id = $1',
      [eventId]
    );
    
    // Get guest user details if guest IDs were provided
    let guests = [];
    if (guestIdsString) {
      const guestIds = guestIdsString.split(',').map(id => parseInt(id.trim()));
      const guestsResult = await db.query(
        'SELECT user_id, full_name FROM users WHERE user_id = ANY($1::int[])',
        [guestIds]
      );
      
      guests = guestsResult.rows.map(user => ({
        id: user.user_id,
        name: user.full_name
      }));
    }
    
    logger.info(`Meeting created for event ${eventId}: ${title}`);
    
    res.status(201).json({
      id: meeting.meeting_id,
      title: meeting.title,
      description: meeting.description,
      meetingDate: meeting.meeting_date,
      meetingUrl: meeting.meeting_url,
      event: {
        id: meeting.event_id,
        name: eventResult.rows[0]?.name
      },
      guests,
      createdAt: meeting.created_at
    });
  } catch (error) {
    logger.error(`Error creating meeting: ${error.message}`);
    next(error);
  }
};

// @desc    Get all meetings
// @route   GET /api/meetings
// @access  Private (company member)
exports.getMeetings = async (req, res, next) => {
  try {
    const { eventId, startDate, endDate, page = 1, limit = 10 } = req.query;
    const companyId = req.user.company_id;
    
    // Calculate offset for pagination
    const offset = (page - 1) * limit;
    
    // Build query with filters
    let query = `
      SELECT rm.meeting_id, rm.title, rm.description, rm.meeting_date, rm.guest_user_ids,
      rm.meeting_url, rm.event_id, e.name as event_name, d.name as department_name
      FROM raci_meetings rm
      JOIN events e ON rm.event_id = e.event_id
      JOIN departments d ON e.department_id = d.department_id
      WHERE d.company_id = $1
    `;
    
    const queryParams = [companyId];
    let paramIndex = 2;
    
    if (eventId) {
      query += ` AND rm.event_id = $${paramIndex++}`;
      queryParams.push(eventId);
    }
    
    if (startDate) {
      query += ` AND rm.meeting_date >= $${paramIndex++}`;
      queryParams.push(startDate);
    }
    
    if (endDate) {
      query += ` AND rm.meeting_date <= $${paramIndex++}`;
      queryParams.push(endDate);
    }
    
    // Add sorting and pagination
    query += ` ORDER BY rm.meeting_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    queryParams.push(limit, offset);
    
    const { rows } = await db.query(query, queryParams);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) FROM raci_meetings rm
      JOIN events e ON rm.event_id = e.event_id
      JOIN departments d ON e.department_id = d.department_id
      WHERE d.company_id = $1
    `;
    
    const countParams = [companyId];
    let countParamIndex = 2;
    
    if (eventId) {
      countQuery += ` AND rm.event_id = $${countParamIndex++}`;
      countParams.push(eventId);
    }
    
    if (startDate) {
      countQuery += ` AND rm.meeting_date >= $${countParamIndex++}`;
      countParams.push(startDate);
    }
    
    if (endDate) {
      countQuery += ` AND rm.meeting_date <= $${countParamIndex++}`;
      countParams.push(endDate);
    }
    
    const countResult = await db.query(countQuery, countParams);
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);
    
    // Format the meetings data
    const meetings = await Promise.all(rows.map(async (meeting) => {
      // Get guest details if available
      let guests = [];
      if (meeting.guest_user_ids) {
        const guestIds = meeting.guest_user_ids.split(',').map(id => parseInt(id.trim()));
        const guestsResult = await db.query(
          'SELECT user_id, full_name FROM users WHERE user_id = ANY($1::int[])',
          [guestIds]
        );
        
        guests = guestsResult.rows.map(user => ({
          id: user.user_id,
          name: user.full_name
        }));
      }
      
      return {
        id: meeting.meeting_id,
        title: meeting.title,
        description: meeting.description,
        meetingDate: meeting.meeting_date,
        meetingUrl: meeting.meeting_url,
        event: {
          id: meeting.event_id,
          name: meeting.event_name
        },
        department: {
          name: meeting.department_name
        },
        guests
      };
    }));
    
    res.status(200).json({
      totalItems,
      totalPages,
      currentPage: parseInt(page),
      meetings
    });
  } catch (error) {
    logger.error(`Error getting meetings: ${error.message}`);
    next(error);
  }
};

// @desc    Get meeting by ID
// @route   GET /api/meetings/:id
// @access  Private (company member)
exports.getMeetingById = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    
    // Get meeting details
    const meetingResult = await db.query(
      `SELECT rm.*, e.name as event_name, d.name as department_name, d.company_id
       FROM raci_meetings rm
       JOIN events e ON rm.event_id = e.event_id
       JOIN departments d ON e.department_id = d.department_id
       WHERE rm.meeting_id = $1`,
      [meetingId]
    );
    
    if (meetingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }
    
    const meeting = meetingResult.rows[0];
    
    // Verify user belongs to the same company
    if (meeting.company_id !== req.user.company_id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this meeting'
      });
    }
    
    // Get guest details if available
    let guests = [];
    if (meeting.guest_user_ids) {
      const guestIds = meeting.guest_user_ids.split(',').map(id => parseInt(id.trim()));
      const guestsResult = await db.query(
        'SELECT user_id, full_name, email FROM users WHERE user_id = ANY($1::int[])',
        [guestIds]
      );
      
      guests = guestsResult.rows.map(user => ({
        id: user.user_id,
        name: user.full_name,
        email: user.email
      }));
    }
    
    res.status(200).json({
      id: meeting.meeting_id,
      title: meeting.title,
      description: meeting.description,
      meetingDate: meeting.meeting_date,
      meetingUrl: meeting.meeting_url,
      event: {
        id: meeting.event_id,
        name: meeting.event_name
      },
      department: {
        name: meeting.department_name
      },
      guests,
      createdAt: meeting.created_at,
      updatedAt: meeting.updated_at
    });
  } catch (error) {
    logger.error(`Error getting meeting: ${error.message}`);
    next(error);
  }
};

// @desc    Update meeting
// @route   PUT /api/meetings/:id
// @access  Private (meeting creator, company-admin or HOD)
exports.updateMeeting = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    const { title, description, meetingDate, guestUserIds, meetingUrl } = req.body;
    
    // Check if meeting exists
    const meetingCheck = await db.query(
      `SELECT rm.*, e.name as event_name, d.name as department_name, d.company_id, e.created_by, d.hod_id
       FROM raci_meetings rm
       JOIN events e ON rm.event_id = e.event_id
       JOIN departments d ON e.department_id = d.department_id
       WHERE rm.meeting_id = $1`,
      [meetingId]
    );
    
    if (meetingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }
    
    const meeting = meetingCheck.rows[0];
    
    // Check authorization
    const isEventCreator = req.user.user_id === meeting.created_by;
    const isHod = req.user.user_id === meeting.hod_id;
    const isCompanyAdmin = req.user.role === 'company_admin' && 
                          req.user.company_id === meeting.company_id;
                          
    if (!isEventCreator && !isHod && !isCompanyAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this meeting'
      });
    }
    
    // Parse guest user IDs if provided
    let guestIdsString = meeting.guest_user_ids;
    if (guestUserIds !== undefined) {
      if (Array.isArray(guestUserIds)) {
        guestIdsString = guestUserIds.join(',');
      } else {
        guestIdsString = guestUserIds;
      }
    }
    
    // Update meeting
    const result = await db.query(
      `UPDATE raci_meetings
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           meeting_date = COALESCE($3, meeting_date),
           guest_user_ids = COALESCE($4, guest_user_ids),
           meeting_url = COALESCE($5, meeting_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE meeting_id = $6
       RETURNING meeting_id, event_id, title, description, meeting_date, guest_user_ids, meeting_url, created_at, updated_at`,
      [title, description, meetingDate, guestIdsString, meetingUrl, meetingId]
    );
    
    const updatedMeeting = result.rows[0];
    
    // Get guest details if available
    let guests = [];
    if (updatedMeeting.guest_user_ids) {
      const guestIds = updatedMeeting.guest_user_ids.split(',').map(id => parseInt(id.trim()));
      const guestsResult = await db.query(
        'SELECT user_id, full_name FROM users WHERE user_id = ANY($1::int[])',
        [guestIds]
      );
      
      guests = guestsResult.rows.map(user => ({
        id: user.user_id,
        name: user.full_name
      }));
    }
    
    logger.info(`Meeting updated: ${meetingId}`);
    
    res.status(200).json({
      id: updatedMeeting.meeting_id,
      title: updatedMeeting.title,
      description: updatedMeeting.description,
      meetingDate: updatedMeeting.meeting_date,
      meetingUrl: updatedMeeting.meeting_url,
      event: {
        id: updatedMeeting.event_id,
        name: meeting.event_name
      },
      department: {
        name: meeting.department_name
      },
      guests,
      createdAt: updatedMeeting.created_at,
      updatedAt: updatedMeeting.updated_at
    });
  } catch (error) {
    logger.error(`Error updating meeting: ${error.message}`);
    next(error);
  }
};

// @desc    Delete meeting
// @route   DELETE /api/meetings/:id
// @access  Private (meeting creator, company-admin or HOD)
exports.deleteMeeting = async (req, res, next) => {
  try {
    const meetingId = req.params.id;
    
    // Check if meeting exists
    const meetingCheck = await db.query(
      `SELECT rm.*, e.created_by, d.company_id, d.hod_id
       FROM raci_meetings rm
       JOIN events e ON rm.event_id = e.event_id
       JOIN departments d ON e.department_id = d.department_id
       WHERE rm.meeting_id = $1`,
      [meetingId]
    );
    
    if (meetingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found'
      });
    }
    
    const meeting = meetingCheck.rows[0];
    
    // Check authorization
    const isEventCreator = req.user.user_id === meeting.created_by;
    const isHod = req.user.user_id === meeting.hod_id;
    const isCompanyAdmin = req.user.role === 'company_admin' && 
                          req.user.company_id === meeting.company_id;
                          
    if (!isEventCreator && !isHod && !isCompanyAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this meeting'
      });
    }
    
    // Delete meeting
    await db.query(
      'DELETE FROM raci_meetings WHERE meeting_id = $1',
      [meetingId]
    );
    
    logger.info(`Meeting deleted: ${meetingId}`);
    
    res.status(200).json({
      success: true,
      message: 'Meeting deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting meeting: ${error.message}`);
    next(error);
  }
};

// @desc    Get meetings by date range (for calendar)
// @route   GET /api/meetings/calendar
// @access  Private (company member)
exports.getMeetingsByDateRange = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const companyId = req.user.company_id;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required'
      });
    }
    
    // Get meetings within date range
    const query = `
      SELECT rm.meeting_id, rm.title, rm.description, rm.meeting_date, 
      rm.event_id, e.name as event_name
      FROM raci_meetings rm
      JOIN events e ON rm.event_id = e.event_id
      JOIN departments d ON e.department_id = d.department_id
      WHERE d.company_id = $1
      AND rm.meeting_date BETWEEN $2 AND $3
      ORDER BY rm.meeting_date ASC
    `;
    
    const { rows } = await db.query(query, [companyId, startDate, endDate]);
    
    // Format for calendar view
    const calendarEvents = rows.map(meeting => ({
      id: meeting.meeting_id,
      title: meeting.title,
      start: meeting.meeting_date,
      description: meeting.description,
      eventId: meeting.event_id,
      eventName: meeting.event_name
    }));
    
    res.status(200).json({
      success: true,
      calendarEvents
    });
  } catch (error) {
    logger.error(`Error getting calendar meetings: ${error.message}`);
    next(error);
  }
};
