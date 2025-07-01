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
    
    // Step 1: Get all events for the user's company
    const companyEventsResult = await db.query(
      `SELECT e.event_id FROM events e
       JOIN departments d ON e.department_id = d.department_id
       WHERE d.company_id = $1`,
      [companyId]
    );
    
    const companyEventIds = companyEventsResult.rows.map(row => row.event_id);
    console.log(`🏢 Found ${companyEventIds.length} events for company ${companyId}:`, companyEventIds);
    
    if (companyEventIds.length === 0) {
      return res.status(200).json({
        success: true,
        totalItems: 0,
        totalPages: 0,
        currentPage: parseInt(page),
        meetings: [],
        message: 'No events found for your company'
      });
    }
    
    // Step 2: Get meetings that match company events
    let query = `
      SELECT rm.meeting_id, rm.title, rm.description, rm.meeting_date, rm.guest_user_ids,
             rm.meeting_url, rm.event_id, rm.created_at, rm.updated_at,
             e.name as event_name, d.name as department_name
      FROM raci_meetings rm
      LEFT JOIN events e ON rm.event_id = e.event_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE rm.event_id = ANY($1::int[])
    `;
    
    const queryParams = [companyEventIds];
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
    
    console.log(`📅 Query executed with params:`, queryParams);
    console.log(`📅 Found ${rows.length} meetings for company ${companyId} with filters:`, {
      eventId, startDate, endDate, page, limit
    });
    
    if (rows.length > 0) {
      console.log(`📅 Sample meeting result:`, rows[0]);
    }
    
    // Get total count with same event filtering
    let countQuery = `
      SELECT COUNT(*) FROM raci_meetings rm
      WHERE rm.event_id = ANY($1::int[])
    `;
    
    const countParams = [companyEventIds];
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
    
    console.log(`📅 Total meetings count: ${totalItems}, pages: ${totalPages}`);
    
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
      success: true,
      totalItems,
      totalPages,
      currentPage: parseInt(page),
      meetings,
      message: meetings.length === 0 ? 'No meetings found for the specified criteria' : `Retrieved ${meetings.length} meetings`
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
    
    // Step 1: Get company events
    const companyEventsResult = await db.query(
      `SELECT e.event_id FROM events e
       JOIN departments d ON e.department_id = d.department_id
       WHERE d.company_id = $1`,
      [req.user.company_id]
    );
    
    const companyEventIds = companyEventsResult.rows.map(row => row.event_id);
    
    // Step 2: Get meeting details only if it belongs to company events or user is guest
    const meetingResult = await db.query(
      `SELECT rm.*, e.name as event_name, d.name as department_name
       FROM raci_meetings rm
       LEFT JOIN events e ON rm.event_id = e.event_id
       LEFT JOIN departments d ON e.department_id = d.department_id
       WHERE rm.meeting_id = $1
         AND (rm.event_id = ANY($2::int[]) OR rm.guest_user_ids::text LIKE '%' || $3 || '%')`,
      [meetingId, companyEventIds, req.user.user_id]
    );
    
    if (meetingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found or access denied'
      });
    }
    
    const meeting = meetingResult.rows[0];
    
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
    
    // Step 1: Get company events
    const companyEventsResult = await db.query(
      `SELECT e.event_id FROM events e
       JOIN departments d ON e.department_id = d.department_id
       WHERE d.company_id = $1`,
      [req.user.company_id]
    );
    
    const companyEventIds = companyEventsResult.rows.map(row => row.event_id);
    
    // Step 2: Check if meeting exists and user has access
    const meetingCheck = await db.query(
      `SELECT rm.*, e.name as event_name, d.name as department_name, e.created_by, d.hod_id
       FROM raci_meetings rm
       LEFT JOIN events e ON rm.event_id = e.event_id
       LEFT JOIN departments d ON e.department_id = d.department_id
       WHERE rm.meeting_id = $1
         AND (rm.event_id = ANY($2::int[]) OR rm.guest_user_ids::text LIKE '%' || $3 || '%')`,
      [meetingId, companyEventIds, req.user.user_id]
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
    const isCompanyAdmin = req.user.role === 'company_admin';
                          
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
    
    // Step 1: Get company events
    const companyEventsResult = await db.query(
      `SELECT e.event_id FROM events e
       JOIN departments d ON e.department_id = d.department_id
       WHERE d.company_id = $1`,
      [req.user.company_id]
    );
    
    const companyEventIds = companyEventsResult.rows.map(row => row.event_id);
    
    // Step 2: Check if meeting exists and user has access
    const meetingCheck = await db.query(
      `SELECT rm.*, e.created_by, d.hod_id
       FROM raci_meetings rm
       LEFT JOIN events e ON rm.event_id = e.event_id
       LEFT JOIN departments d ON e.department_id = d.department_id
       WHERE rm.meeting_id = $1
         AND (rm.event_id = ANY($2::int[]) OR rm.guest_user_ids::text LIKE '%' || $3 || '%')`,
      [meetingId, companyEventIds, req.user.user_id]
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
    const isCompanyAdmin = req.user.role === 'company_admin';
                          
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
    const { startDate, endDate, date, debug } = req.query;
    const companyId = req.user.company_id;
    
    let queryStartDate, queryEndDate;
    
    // Handle single date query (for daily view)
    if (date && !startDate && !endDate) {
      // If single date is provided, create start and end of that day
      const singleDate = new Date(date);
      queryStartDate = new Date(singleDate.getFullYear(), singleDate.getMonth(), singleDate.getDate()).toISOString();
      queryEndDate = new Date(singleDate.getFullYear(), singleDate.getMonth(), singleDate.getDate() + 1).toISOString();
    } else if (startDate && endDate) {
      queryStartDate = startDate;
      queryEndDate = endDate;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Either date parameter or both startDate and endDate are required'
      });
    }
    
    console.log(`🗓️ Getting calendar meetings for company ${companyId} between ${queryStartDate} and ${queryEndDate}`);
    
    // Step 1: Get all events for the user's company
    const companyEventsResult = await db.query(
      `SELECT e.event_id FROM events e
       JOIN departments d ON e.department_id = d.department_id
       WHERE d.company_id = $1`,
      [companyId]
    );
    
    const companyEventIds = companyEventsResult.rows.map(row => row.event_id);
    console.log(`🗓️ Found ${companyEventIds.length} events for company ${companyId}:`, companyEventIds);
    
    if (companyEventIds.length === 0) {
      return res.status(200).json({
        success: true,
        calendarEvents: [],
        meetings: [],
        totalItems: 0,
        dateRange: {
          start: queryStartDate,
          end: queryEndDate
        }
      });
    }
    
    // Step 2: Get meetings for company events within date range
    const query = `
      SELECT rm.meeting_id, rm.title, rm.description, rm.meeting_date, 
             rm.guest_user_ids, rm.meeting_url, rm.event_id, rm.created_at, rm.updated_at,
             e.name as event_name, e.description as event_description,
             d.name as department_name, d.department_id
      FROM raci_meetings rm
      LEFT JOIN events e ON rm.event_id = e.event_id
      LEFT JOIN departments d ON e.department_id = d.department_id
      WHERE rm.event_id = ANY($1::int[])
        AND rm.meeting_date BETWEEN $2 AND $3
      ORDER BY rm.meeting_date ASC
    `;
    const queryParams = [companyEventIds, queryStartDate, queryEndDate];
    
    const { rows } = await db.query(query, queryParams);
    
    console.log(`🗓️ Calendar query executed with params:`, queryParams);
    console.log(`🔍 Query results:`, rows);
    console.log(`🗓️ Found ${rows.length} meetings for the date range`);
    
    if (rows.length > 0) {
      console.log(`🗓️ Sample calendar meeting result:`, rows[0]);
    }
    
    // Format meetings with complete details
    const meetings = await Promise.all(rows.map(async (meeting) => {
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
      
      return {
        id: meeting.meeting_id,
        title: meeting.title,
        description: meeting.description,
        meetingDate: meeting.meeting_date,
        start: meeting.meeting_date, // For calendar compatibility
        meetingUrl: meeting.meeting_url,
        event: {
          id: meeting.event_id,
          name: meeting.event_name,
          description: meeting.event_description
        },
        department: {
          id: meeting.department_id,
          name: meeting.department_name
        },
        guests,
        createdAt: meeting.created_at,
        updatedAt: meeting.updated_at
      };
    }));
    
    res.status(200).json({
      success: true,
      calendarEvents: meetings, // For calendar compatibility
      meetings: meetings, // For detailed meeting view
      totalItems: meetings.length,
      dateRange: {
        start: queryStartDate,
        end: queryEndDate
      }
    });
  } catch (error) {
    logger.error(`Error getting calendar meetings: ${error.message}`);
    next(error);
  }
};
