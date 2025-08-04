import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import meetingService from '../../src/services/meeting.service';
import authService from '../../src/services/auth.service';

const TaskCalendar = () => {
  const navigate = useNavigate();
  // State for calendar view
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // State for modal
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  
  // State for tasks and meetings
  const [tasks, setTasks] = useState([]);
  const [meetings, setMeetings] = useState([]); // For meeting list (filtered)
  const [allMeetings, setAllMeetings] = useState([]); // For calendar (all user meetings)
  const [user, setUser] = useState(null);
  
  // Date range filter state  
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const oneWeekLater = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      startDate: today.toISOString().split('T')[0],
      endDate: oneWeekLater.toISOString().split('T')[0]
    };
  });
  
  // Additional filters for meeting list only (calendar shows all meetings)
  const [meetingListFilters, setMeetingListFilters] = useState({
    statusFilter: 'upcoming', // all, upcoming, today, this-week, past
    eventFilter: ''
  });

  // Load current user
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const userData = await authService.getCurrentUser();
        console.log('TaskCalendar: Current user:', userData);
        setUser(userData);
      } catch (error) {
        console.error('TaskCalendar: Error loading current user:', error);
      }
    };

    loadCurrentUser();
  }, []);

  // Load meetings when user is loaded (initial load)
  useEffect(() => {
    if (user) {
      loadMeetingsForMonth();
      loadAllUserMeetingsForCalendar();
    }
  }, [user]);

  // Load meetings when date range changes (for list only)
  useEffect(() => {
    if (user) {
      loadMeetingsForMonth();
    }
  }, [dateRange]);

  // Debug logging for meetings state changes
  useEffect(() => {
    console.log('TaskCalendar: Meetings state updated:', meetings.length, 'meetings loaded');
    meetings.forEach((meeting, index) => {
      console.log(`TaskCalendar Meeting ${index + 1}:`, meeting.title, `(${meeting.eventName || 'No Event'})`);
    });
  }, [meetings]);

  // Load ALL user meetings for calendar (no date restrictions)
  const loadAllUserMeetingsForCalendar = async () => {
    if (!user) {
      console.log('[TaskCalendar] No user loaded, skipping all meetings load');
      return;
    }

    try {
      // Get user ID in multiple possible formats
      const userId = user.id || user.userId || user.user_id;
      console.log('[TaskCalendar] Loading ALL meetings for calendar for user:', user.name, `(ID: ${userId})`);

      // Get ALL meetings without date restriction
      const response = await meetingService.getAllMeetings({
        limit: 1000 // Get all meetings
      });
      
      console.log('[TaskCalendar] All meetings API response for calendar:', response);
      
      // Extract meetings from different possible response formats
      let allMeetingsFromAPI = [];
      if (response && response.success && response.meetings) {
        allMeetingsFromAPI = response.meetings;
      } else if (response && response.meetings) {
        allMeetingsFromAPI = response.meetings;
      } else if (response && Array.isArray(response)) {
        allMeetingsFromAPI = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        allMeetingsFromAPI = response.data;
      }
      
      // Filter meetings to only show ones where the user is a guest
      const allUserMeetings = allMeetingsFromAPI.filter(meeting => {
        if (!meeting.guests || !Array.isArray(meeting.guests)) {
          return false;
        }
        
        const isGuest = meeting.guests.some(guest => {
          const guestId = guest.id || guest.userId || guest.user_id;
          const isMatch = guestId == userId || 
                        String(guestId) === String(userId) ||
                        guest.email === user.email;
          return isMatch;
        });
        
        return isGuest;
      });
      
      console.log('[TaskCalendar] ALL user meetings for calendar:', allUserMeetings.length, 'meetings');
      setAllMeetings(allUserMeetings);
      
    } catch (error) {
      console.error('[TaskCalendar] Error loading all user meetings for calendar:', error);
      setAllMeetings([]);
    }
  };

  const loadMeetingsForMonth = async () => {
    if (!user) {
      console.log('[TaskCalendar] No user loaded, skipping meeting load');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get user ID in multiple possible formats
      const userId = user.id || user.userId || user.user_id;
      console.log('[TaskCalendar] Loading meetings for list for user:', user.name, `(ID: ${userId})`);
      
      const startDate = dateRange.startDate;
      const endDate = dateRange.endDate;

      console.log('[TaskCalendar] Fetching meetings from', startDate, 'to', endDate, 'for list view');

      // Try regular meetings endpoint first
      try {
        const response = await meetingService.getAllMeetings({
          startDate: startDate,
          endDate: endDate,
          limit: 100
        });
        
        console.log('[TaskCalendar] List meetings API response:', response);
        
        // Extract meetings from different possible response formats
        let allMeetingsFromAPI = [];
        if (response && response.success && response.meetings) {
          allMeetingsFromAPI = response.meetings;
        } else if (response && response.meetings) {
          allMeetingsFromAPI = response.meetings;
        } else if (response && Array.isArray(response)) {
          allMeetingsFromAPI = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          allMeetingsFromAPI = response.data;
        }
        
        console.log('[TaskCalendar] Total meetings found for list:', allMeetingsFromAPI.length);
        
        // Filter meetings to only show ones where the user is a guest
        const userMeetings = allMeetingsFromAPI.filter(meeting => {
          if (!meeting.guests || !Array.isArray(meeting.guests)) {
            return false;
          }
          
          const isGuest = meeting.guests.some(guest => {
            // Check multiple possible ID formats and types
            const guestId = guest.id || guest.userId || guest.user_id;
            const isMatch = guestId == userId || // Loose equality to handle string/number differences
                          String(guestId) === String(userId) ||
                          guest.email === user.email; // Also match by email as fallback
            return isMatch;
          });
          
          return isGuest;
        });
        
        console.log('[TaskCalendar] User assigned meetings for list:', userMeetings.length, 'out of', allMeetingsFromAPI.length, 'total meetings');
        setMeetings(userMeetings);
        
      } catch (meetingError) {
        console.error('[TaskCalendar] Error with meetings endpoint:', meetingError);
        setMeetings([]);
      }
      
    } catch (error) {
      console.error('[TaskCalendar] Error loading meetings for list:', error);
      if (!error.message.includes('501') && !error.message.includes('not yet implemented')) {
        setError('Failed to load your assigned meetings: ' + error.message);
      }
      setMeetings([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyDateRangeFilter = () => {
    loadMeetingsForMonth();
  };
  
  // Mock data for tasks (will be replaced with real API later)
  useEffect(() => {
    setTasks([
      {
        id: 1,
        title: 'Complete RACI matrix for Project Alpha',
        dueDate: '2023-07-15',
        priority: 'High',
        status: 'In Progress',
        event: 'Project Alpha Launch'
      },
      {
        id: 2,
        title: 'Review budget proposal',
        dueDate: '2023-07-22',
        priority: 'Medium',
        status: 'Not Started',
        event: 'Q3 Budget Planning'
      },
      {
        id: 3,
        title: 'Approve design mockups',
        dueDate: '2023-07-10',
        priority: 'Low',
        status: 'Completed',
        event: 'Website Redesign'
      }
    ]);
  }, []);
  
  // Helper functions for calendar
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };
  
  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };
  
  const getMonthName = (date) => {
    return date.toLocaleString('default', { month: 'long' });
  };
  
  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };
  
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };
  
  const handleDateClick = (day) => {
    setSelectedDate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day));
  };

  const handleMeetingClick = (meeting, e) => {
    e.stopPropagation(); // Prevent date click
    setSelectedMeeting(meeting);
    setShowMeetingModal(true);
  };

  const closeMeetingModal = () => {
    setShowMeetingModal(false);
    setSelectedMeeting(null);
  };

  // Get tasks for a specific day
  const getTasksForDay = (day) => {
    const dateString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(task => task.dueDate === dateString);
  };

  // Get meetings for a specific day (use allMeetings for calendar)
  const getMeetingsForDay = (day) => {
    const dateString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // Use allMeetings for calendar display to show ALL user meetings
    return allMeetings.filter(meeting => {
      const meetingDate = new Date(meeting.meetingDate || meeting.start);
      return meetingDate.toISOString().split('T')[0] === dateString;
    });
  };
  
  // Generate calendar grid
  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];
    
    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }
    
    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dayTasks = getTasksForDay(day);
      const dayMeetings = getMeetingsForDay(day);
      
      days.push(
        <div key={day} className="calendar-day" onClick={() => handleDateClick(day)}>
          <div className="day-number">{day}</div>
          
          {/* Render tasks */}
          {dayTasks.map((task, index) => (
            <div key={`task-${index}`} className="event-indicator task-event">
              📝 {task.title.length > 20 ? task.title.substring(0, 20) + '...' : task.title}
            </div>
          ))}
          
          {/* Render meetings */}
          {dayMeetings.map((meeting, index) => {
            const meetingTime = new Date(meeting.meetingDate || meeting.start);
            return (
              <div 
                key={`meeting-${index}`} 
                className="event-indicator meeting-event"
                onClick={(e) => handleMeetingClick(meeting, e)}
                style={{ cursor: 'pointer' }}
                title="Click to view meeting details"
              >
                🎯 {meetingTime.toTimeString().slice(0, 5)} - {meeting.title}
              </div>
            );
          })}
        </div>
      );
    }
    
    return days;
  };

  const formatMeetingDateTime = (meetingDate) => {
    const date = new Date(meetingDate);
    return {
      date: date.toLocaleDateString(),
      time: date.toTimeString().slice(0, 5)
    };
  };

  // Filter meetings for list display (calendar always shows all meetings)
  const getFilteredMeetingsForList = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    return meetings.filter(meeting => {
      const meetingDate = new Date(meeting.meetingDate || meeting.start);
      
      // Apply status filter
      switch (meetingListFilters.statusFilter) {
        case 'today':
          if (meetingDate.toDateString() !== today.toDateString()) return false;
          break;
        case 'this-week':
          if (!(meetingDate >= today && meetingDate <= weekFromNow)) return false;
          break;
        case 'upcoming':
          if (meetingDate < today) return false;
          break;
        case 'past':
          if (meetingDate >= today) return false;
          break;
        case 'all':
        default:
          // Show all meetings
          break;
      }
      
      // Apply event filter
      if (meetingListFilters.eventFilter) {
        const eventName = meeting.eventName || meeting.event?.name || '';
        if (!eventName.toLowerCase().includes(meetingListFilters.eventFilter.toLowerCase())) {
          return false;
        }
      }
      
      return true;
    });
  };

  const getItemsForSelectedDate = () => {
    if (!selectedDate) return { tasks: [], meetings: [] };
    
    const selectedTasks = getTasksForDay(selectedDate.getDate());
    const selectedMeetings = getMeetingsForDay(selectedDate.getDate());
    
    return { tasks: selectedTasks, meetings: selectedMeetings };
  };

  const handleBackToDashboard = () => {
    navigate('/user/raci-dashboard');
  };

  return (
    <div style={{ padding: '2rem', margin: '0 2rem' }}>
      <div className="page-header" style={{ position: 'relative', marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ margin: 0 }}>My Calendar</h1>
        <p style={{ margin: '0.5rem 0 0 0' }}>View your assigned tasks and meetings</p>
      </div>

      {error && (
        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
          {error}
          <button 
            className="alert-close" 
            onClick={() => setError(null)}
            style={{ marginLeft: '1rem', background: 'none', border: 'none', fontSize: '1.2rem' }}
          >
            ×
          </button>
        </div>
      )}

      {loading && (
        <div className="loading-container" style={{ minHeight: '200px' }}>
          <div className="loading-spinner"></div>
          <p>Loading calendar data...</p>
        </div>
      )}

      {/* Calendar */}
      <div className="calendar-container">
        <div className="calendar-header">
          <div className="calendar-title">
            {getMonthName(currentMonth)} {currentMonth.getFullYear()}
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '0.25rem' }}>
              {loading ? 'Loading meetings...' : `${allMeetings.length} total meeting${allMeetings.length === 1 ? '' : 's'} where you are invited`}
            </div>
          </div>
          <div className="calendar-nav">
            <button className="btn btn-secondary" onClick={prevMonth} disabled={loading}>
              ‹ Previous
            </button>
            <button className="btn btn-secondary" onClick={nextMonth} disabled={loading}>
              Next ›
            </button>
          </div>
        </div>
        
        <div className="calendar-grid">
          {/* Day headers */}
          <div className="calendar-day-header">Sunday</div>
          <div className="calendar-day-header">Monday</div>
          <div className="calendar-day-header">Tuesday</div>
          <div className="calendar-day-header">Wednesday</div>
          <div className="calendar-day-header">Thursday</div>
          <div className="calendar-day-header">Friday</div>
          <div className="calendar-day-header">Saturday</div>
          
          {/* Calendar days */}
          {renderCalendarDays()}
        </div>
      </div>

      {/* Meeting Details List */}
      <div className="card" style={{ marginBottom: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', border: '1px solid #e5e7eb' }}>
        <div className="card-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', borderRadius: '8px 8px 0 0', padding: '1rem 1.5rem' }}>
          {/* Centered Title Section */}
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: '600' }}>🎯 My Meetings</h2>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', opacity: 0.9 }}>
              Meetings where you are invited as a guest
            </p>
          </div>
          
          {/* Compact Filter Controls */}
          <div style={{ 
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.75rem',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.1)',
            padding: '0.75rem 1rem',
            borderRadius: '6px',
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>From:</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                style={{
                  padding: '0.4rem 0.6rem',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#374151',
                  width: '130px'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>To:</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                style={{
                  padding: '0.4rem 0.6rem',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#374151',
                  width: '130px'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Status:</label>
              <select
                value={meetingListFilters.statusFilter}
                onChange={(e) => setMeetingListFilters(prev => ({ ...prev, statusFilter: e.target.value }))}
                style={{
                  padding: '0.4rem 0.6rem',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#374151',
                  width: '100px'
                }}
              >
                <option value="all">All</option>
                <option value="upcoming">Upcoming</option>
                <option value="today">Today</option>
                <option value="this-week">This Week</option>
                <option value="past">Past</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Event:</label>
              <input
                type="text"
                placeholder="Filter by event..."
                value={meetingListFilters.eventFilter}
                onChange={(e) => setMeetingListFilters(prev => ({ ...prev, eventFilter: e.target.value }))}
                style={{
                  padding: '0.4rem 0.6rem',
                  border: '1px solid rgba(255,255,255,0.3)',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  background: 'rgba(255,255,255,0.9)',
                  color: '#374151',
                  width: '120px'
                }}
              />
            </div>

            <button
              onClick={applyDateRangeFilter}
              disabled={loading}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '0.4rem 0.8rem',
                borderRadius: '4px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(10px)',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.3)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.2)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              {loading ? '⏳ Loading...' : '🔍 Apply'}
            </button>
            
            <div style={{ 
              fontSize: '0.8rem', 
              fontWeight: '600',
              background: 'rgba(255,255,255,0.25)',
              padding: '0.4rem 0.8rem',
              borderRadius: '15px',
              border: '1px solid rgba(255,255,255,0.3)',
              whiteSpace: 'nowrap'
            }}>
              📊 {getFilteredMeetingsForList().length} meetings
            </div>
          </div>
        </div>
        {meetings.length > 0 ? (
          <div className="card-body" style={{ padding: '1.5rem', background: '#f8f9fa' }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', 
              gap: '1.25rem' 
            }}>
              {getFilteredMeetingsForList()
                .sort((a, b) => new Date(a.meetingDate || a.start) - new Date(b.meetingDate || b.start))
                .map((meeting, index) => {
                  const { date, time } = formatMeetingDateTime(meeting.meetingDate || meeting.start);
                  const meetingDate = new Date(meeting.meetingDate || meeting.start);
                  const isToday = meetingDate.toDateString() === new Date().toDateString();
                  const isPast = meetingDate < new Date();
                  
                  return (
                    <div key={index} className="meeting-card" style={{ 
                      background: 'white',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-4px)';
                      e.target.style.boxShadow = '0 10px 25px -3px rgba(0, 0, 0, 0.15), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
                    }}
                    >
                      {/* Status indicator stripe */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: isToday ? 'linear-gradient(90deg, #dc2626, #ef4444)' : isPast ? 'linear-gradient(90deg, #9ca3af, #6b7280)' : 'linear-gradient(90deg, #10b981, #34d399)'
                      }}></div>
                      
                      {/* Status badge */}
                      <div style={{
                        position: 'absolute',
                        top: '1rem',
                        right: '1rem',
                        background: isToday ? '#dc2626' : isPast ? '#6b7280' : '#10b981',
                        color: 'white',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {isToday ? 'Today' : isPast ? 'Past' : 'Upcoming'}
                      </div>
                      
                      <div style={{ paddingRight: '4rem', paddingTop: '0.5rem' }}>
                        {/* Meeting title */}
                        <h3 style={{ 
                          margin: '0 0 1rem 0', 
                          color: '#111827', 
                          fontSize: '1.25rem', 
                          fontWeight: '700',
                          lineHeight: '1.4'
                        }}>
                          {meeting.title || 'Untitled Meeting'}
                        </h3>
                        
                        {/* Date and time info */}
                        <div style={{ 
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          marginBottom: '1rem',
                          flexWrap: 'wrap'
                        }}>
                          <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: '#f3f4f6',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151'
                          }}>
                            <span style={{ fontSize: '1rem' }}>📅</span>
                            {date}
                          </div>
                          <div style={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: '#f3f4f6',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            fontWeight: '500',
                            color: '#374151'
                          }}>
                            <span style={{ fontSize: '1rem' }}>🕒</span>
                            {time}
                          </div>
                        </div>
                        
                        {/* Description */}
                        {meeting.description && (
                          <div style={{ 
                            fontSize: '0.9rem', 
                            color: '#6b7280', 
                            marginBottom: '1rem',
                            lineHeight: '1.6',
                            background: '#f9fafb',
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #f3f4f6'
                          }}>
                            {meeting.description}
                          </div>
                        )}
                        
                        {/* Tags */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                          {meeting.eventName && (
                            <span style={{
                              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                              color: 'white',
                              padding: '0.375rem 0.75rem',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.3)'
                            }}>
                              <span>📋</span>
                              {meeting.eventName}
                            </span>
                          )}
                          
                          {meeting.guests && meeting.guests.length > 1 && (
                            <span style={{
                              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                              color: 'white',
                              padding: '0.375rem 0.75rem',
                              borderRadius: '20px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.375rem',
                              boxShadow: '0 2px 4px rgba(5, 150, 105, 0.3)'
                            }}>
                              <span>👥</span>
                              {meeting.guests.length} participants
                            </span>
                          )}
                        </div>
                        
                        {/* Action button */}
                        {meeting.meetingUrl && (
                          <div style={{ marginTop: '1rem' }}>
                            <a 
                              href={meeting.meetingUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              style={{
                                background: isToday ? 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)' : 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                                color: 'white',
                                padding: '0.75rem 1.5rem',
                                borderRadius: '8px',
                                textDecoration: 'none',
                                fontWeight: '600',
                                fontSize: '0.875rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                transition: 'all 0.2s ease',
                                boxShadow: isToday ? '0 4px 12px rgba(220, 38, 38, 0.4)' : '0 4px 12px rgba(79, 70, 229, 0.4)',
                                border: 'none'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.transform = 'translateY(-2px)';
                                e.target.style.boxShadow = isToday ? '0 6px 20px rgba(220, 38, 38, 0.5)' : '0 6px 20px rgba(79, 70, 229, 0.5)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0)';
                                e.target.style.boxShadow = isToday ? '0 4px 12px rgba(220, 38, 38, 0.4)' : '0 4px 12px rgba(79, 70, 229, 0.4)';
                              }}
                            >
                              <span>🚀</span>
                              Join Meeting
                            </a>
                          </div>
                        )}
                      </div>
                      
                      {/* Meeting ID footer */}
                      {meeting.id && (
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#9ca3af',
                          borderTop: '1px solid #f3f4f6',
                          paddingTop: '0.75rem',
                          marginTop: '1rem',
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                        }}>
                          Meeting ID: <span style={{ fontWeight: '600', color: '#6b7280' }}>{meeting.id}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ) : (
          <div className="card-body" style={{ 
            textAlign: 'center', 
            padding: '3rem 2rem',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            borderRadius: '0 0 12px 12px'
          }}>
            <div style={{ 
              fontSize: '3rem', 
              marginBottom: '1rem',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              📅
            </div>
            <h3 style={{ 
              color: '#374151', 
              marginBottom: '0.75rem', 
              fontSize: '1.25rem',
              fontWeight: '600'
            }}>
              {loading ? 'Loading Your Meetings...' : 'No Meetings Found'}
            </h3>
            <p style={{ 
              color: '#6b7280', 
              marginBottom: '1.5rem',
              fontSize: '1rem',
              lineHeight: '1.5',
              maxWidth: '350px',
              margin: '0 auto 1.5rem auto'
            }}>
              {loading ? 'Please wait while we fetch your meeting invitations...' : `No meetings found where you are invited as a guest for the selected date range.`}
            </p>
            {!loading && (
              <div style={{ 
                background: 'white',
                borderRadius: '8px',
                padding: '1rem',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                border: '1px solid #e2e8f0',
                maxWidth: '400px',
                margin: '0 auto'
              }}>
                <div style={{ fontSize: '0.9rem', color: '#4f46e5', fontWeight: '600', marginBottom: '0.75rem' }}>
                  💡 Helpful Tips
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6b7280', textAlign: 'left', lineHeight: '1.5' }}>
                  <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ color: '#10b981' }}>•</span>
                    <span>You will only see meetings where you are invited as a guest</span>
                  </div>
                  <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ color: '#f59e0b' }}>•</span>
                    <span>Try adjusting the date range above to see more meetings</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                    <span style={{ color: '#ef4444' }}>•</span>
                    <span>Contact meeting organizers if you think you should be invited</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Meeting Modal */}
      {showMeetingModal && selectedMeeting && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h2 style={{
                margin: 0,
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#111827'
              }}>
                🎯 Meeting Details
              </h2>
              <button
                onClick={closeMeetingModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: '#6b7280',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6b7280';
                }}
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div>
              {/* Meeting Title */}
              <h3 style={{
                margin: '0 0 1rem 0',
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#111827'
              }}>
                {selectedMeeting.title || 'Untitled Meeting'}
              </h3>

              {/* Date and Time */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                marginBottom: '1.5rem',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#f3f4f6',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  <span>📅</span>
                  {formatMeetingDateTime(selectedMeeting.meetingDate || selectedMeeting.start).date}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  background: '#f3f4f6',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  color: '#374151'
                }}>
                  <span>🕒</span>
                  {formatMeetingDateTime(selectedMeeting.meetingDate || selectedMeeting.start).time}
                </div>
              </div>

              {/* Description */}
              {selectedMeeting.description && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Description
                  </h4>
                  <p style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    color: '#6b7280',
                    lineHeight: '1.6',
                    background: '#f9fafb',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #f3f4f6'
                  }}>
                    {selectedMeeting.description}
                  </p>
                </div>
              )}

              {/* Event Name */}
              {selectedMeeting.eventName && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Event
                  </h4>
                  <span style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    color: 'white',
                    padding: '0.375rem 0.75rem',
                    borderRadius: '20px',
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span>📋</span>
                    {selectedMeeting.eventName}
                  </span>
                </div>
              )}

              {/* Participants */}
              {selectedMeeting.guests && selectedMeeting.guests.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Participants ({selectedMeeting.guests.length})
                  </h4>
                  <div style={{
                    background: '#f9fafb',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #f3f4f6'
                  }}>
                    {selectedMeeting.guests.map((guest, index) => (
                      <div key={index} style={{
                        fontSize: '0.875rem',
                        color: '#6b7280',
                        marginBottom: index < selectedMeeting.guests.length - 1 ? '0.25rem' : 0
                      }}>
                        👤 {guest.name || guest.email || 'Unknown Participant'}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Meeting ID */}
              {selectedMeeting.id && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <h4 style={{
                    margin: '0 0 0.5rem 0',
                    fontSize: '1rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Meeting ID
                  </h4>
                  <div style={{
                    fontSize: '0.875rem',
                    color: '#6b7280',
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    background: '#f9fafb',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    border: '1px solid #f3f4f6'
                  }}>
                    {selectedMeeting.id}
                  </div>
                </div>
              )}

              {/* Join Meeting Button */}
              {selectedMeeting.meetingUrl && (
                <div style={{ textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid #e5e7eb' }}>
                  <a
                    href={selectedMeeting.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
                      color: 'white',
                      padding: '0.75rem 2rem',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: '600',
                      fontSize: '1rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.5)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.4)';
                    }}
                  >
                    <span>🚀</span>
                    Join Meeting
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .task-event {
          background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
          color: white;
          padding: 2px 4px;
          margin: 1px 0;
          border-radius: 3px;
          font-size: 0.7rem;
          line-height: 1.2;
        }

        .meeting-event {
          background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
          color: white;
          padding: 2px 4px;
          margin: 1px 0;
          border-radius: 3px;
          font-size: 0.7rem;
          line-height: 1.2;
        }

        .priority-badge {
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .priority-high {
          background: #fee2e2;
          color: #991b1b;
        }

        .priority-medium {
          background: #fef3c7;
          color: #92400e;
        }

        .priority-low {
          background: #dcfce7;
          color: #166534;
        }

        .status-badge {
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .status-completed {
          background: #dcfce7;
          color: #166534;
        }

        .status-in-progress {
          background: #dbeafe;
          color: #1e40af;
        }

        .status-not-started {
          background: #f3f4f6;
          color: #374151;
        }
      `}</style>
    </div>
  );
};

export default TaskCalendar;
