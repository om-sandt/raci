import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import '../../styles/dashboard.scss';
import meetingService from '../../src/services/meeting.service';
import authService from '../../src/services/auth.service';
import env from '../../src/config/env';

const MeetingCalendar = () => {
  const navigate = useNavigate();
  
  // State for calendar view
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // State for company data and user
  const [companyData, setCompanyData] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingCompany, setLoadingCompany] = useState(true);
  
  // State for expanded sections in sidebar
  const [expandedSections, setExpandedSections] = useState({
    users: false,
    departments: false,
    designations: false,
    locations: false,
    raci: true // Auto-expand RACI section
  });
  
  // State for sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Toggle sidebar function
  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  
  // Helper to build correct asset URLs (consistent with Dashboard)
  const getAssetUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    let base;
    if (env.apiBaseUrl && env.apiBaseUrl.startsWith('http')) {
      base = env.apiBaseUrl.replace(/\/?api$/i, '');
    } else {
      base = env.apiBaseUrl || '';
    }
    return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : '/' + path}`;
  };

  // Enhanced logo rendering methods (consistent with Dashboard)
  const renderCompanyLogo = () => {
    if (!companyData) return null;
    
    const rawLogo = companyData.logoUrl || companyData.logo;
    if (rawLogo) {
      const logoUrl = rawLogo.startsWith('http')
        ? rawLogo
        : `${env.apiHost}${rawLogo}`;
      
      console.log("Using logo URL:", logoUrl);
      
      return (
        <div style={{ 
          width: '40px', 
          height: '40px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          marginRight: '10px',
          flexShrink: 0,
          border: '1px solid #f3f4f6',
          borderRadius: '4px',
          overflow: 'hidden',
          background: '#fff'
        }}>
          <img 
            src={logoUrl}
            alt={companyData?.name || 'Company'} 
            className="company-logo"
            style={{ 
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain'
            }}
            onError={(e) => {
              console.log("Logo failed to load, using fallback");
              // Replace with first letter of company name inside a colored circle
              const parent = e.target.parentNode;
              parent.innerHTML = `<div style="width: 40px; height: 40px; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;">${companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'C'}</div>`;
            }}
          />
        </div>
      );
    }
    
    // Fallback to letter display
    return (
      <div style={{ 
        width: '40px', 
        height: '40px', 
        borderRadius: '50%', 
        backgroundColor: '#4f46e5', 
        color: 'white', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        fontWeight: 'bold', 
        fontSize: '18px',
        marginRight: '10px',
        flexShrink: 0
      }}>
        {companyData?.name ? companyData.name.charAt(0).toUpperCase() : 'C'}
      </div>
    );
  };

  // Render current user profile photo (used top-right)
  const renderUserPhoto = () => {
    if (!currentUser) return null;
    const photoUrl = currentUser.photo || currentUser.photoUrl || currentUser.profilePhoto;
    if (photoUrl) {
      const finalUrl = getAssetUrl(photoUrl);
      return (
        <img
          src={finalUrl}
          alt={currentUser?.name || 'User'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
          onError={(e) => {
            const parent = e.target.parentNode;
            parent.innerHTML = `<div style=\"width: 100%; height: 100%; border-radius: 50%; background-color: #4f46e5; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 18px;\">${currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}</div>`;
          }}
        />
      );
    }
    return currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U';
  };

  // State for meetings and related data
  const [meetings, setMeetings] = useState([]); // For meeting list (filtered)
  const [allMeetings, setAllMeetings] = useState([]); // For calendar (all meetings)
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [editingMeeting, setEditingMeeting] = useState(null);
  
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
    statusFilter: 'all', // all, upcoming, today, this-week, past
    eventFilter: '',
    participantFilter: ''
  });
  
  // State for guest selection
  const [selectedGuestId, setSelectedGuestId] = useState('');
  const [selectedGuests, setSelectedGuests] = useState([]);
  
  // State for new meeting form
  const [meetingData, setMeetingData] = useState({
    title: '',
    description: '',
    eventId: '',
    meetingDate: '',
    meetingTime: '',
    meetingUrl: '',
    guestUserIds: []
  });

  // Toggle sidebar sections
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('raci_auth_token');
      navigate('/auth/login');
    }
  };
  
  // Load user and company data
  useEffect(() => {
    const fetchUserAndCompany = async () => {
      try {
        // Get current user
        const userData = await authService.getCurrentUser();
        setCurrentUser(userData);
        console.log("User data:", userData);
        
        if (userData && userData.company) {
          setLoadingCompany(true);
          const companyId = userData.company.id;
          
          try {
            // Use direct fetch to handle errors better
            const token = localStorage.getItem('raci_auth_token');
            const response = await fetch(`${env.apiBaseUrl}/companies/${companyId}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
              }
            });
            
            if (response.ok) {
              const companyDetails = await response.json();
              // Map snake_case fields to camelCase for project details compatibility
              const mappedDetails = {
                ...companyDetails,
                projectLogo: companyDetails.projectLogo || companyDetails.project_logo || '',
                projectName: companyDetails.projectName || companyDetails.project_name || ''
              };
              console.log('Company details:', mappedDetails);
              setCompanyData(mappedDetails);
            } else {
              console.warn(`Could not fetch company details, status: ${response.status}`);
              // Still set minimal company data from user object
              const fallbackData = {
                id: userData.company.id,
                name: userData.company.name || 'Your Company'
              };
              setCompanyData(fallbackData);
            }
          } catch (error) {
            console.error('Failed to fetch company details:', error);
            // Use fallback data
            const fallbackData = {
              id: userData.company.id,
              name: userData.company.name || 'Your Company'
            };
            setCompanyData(fallbackData);
          }
        }
      } catch (error) {
        console.error('Failed to load user data:', error);
      } finally {
        setLoadingCompany(false);
      }
    };
    
    fetchUserAndCompany();
  }, []);
  
  // Load initial data
  useEffect(() => {
    console.log('[MeetingCalendar] Component mounted, loading initial data...');
    loadInitialData();
  }, []);

  // Load meetings when date range changes (except for initial load)
  useEffect(() => {
    if (events.length > 0 && users.length > 0) {
      loadMeetingsForMonth();
    }
  }, [dateRange]);

  // Load all meetings for calendar when component mounts
  useEffect(() => {
    if (events.length > 0 && users.length > 0) {
      loadAllMeetingsForCalendar();
    }
  }, [events, users]);

  // Debug logging for events and users state changes
  useEffect(() => {
    console.log('Events state updated:', events.length, 'events loaded');
    events.forEach((event, index) => {
      console.log(`Event ${index + 1}:`, event.name, `(ID: ${event.id})`);
    });
  }, [events]);

  useEffect(() => {
    console.log('Users state updated:', users.length, 'users loaded');
    users.forEach((user, index) => {
      console.log(`User ${index + 1}:`, user.name, `(${user.role}) - ${user.department?.name || 'No Department'}`);
    });
  }, [users]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading initial data for meeting calendar...');

      // Load events and users in parallel
      const [eventsResponse, usersResponse] = await Promise.all([
        meetingService.getEventsForMeeting(),
        meetingService.getUsersForGuests()
      ]);

      console.log('Events response received:', eventsResponse);
      console.log('Users response received:', usersResponse);

      // Handle events response
      if (eventsResponse && eventsResponse.success && eventsResponse.events) {
        console.log('Setting events from response:', eventsResponse.events.length, 'events');
        setEvents(eventsResponse.events);
      } else if (eventsResponse && Array.isArray(eventsResponse)) {
        console.log('Setting events from direct array:', eventsResponse.length, 'events');
        setEvents(eventsResponse);
      } else {
        console.warn('No events found in response:', eventsResponse);
        setEvents([]);
      }

      // Handle users response
      if (usersResponse && usersResponse.success && usersResponse.users) {
        console.log('Setting users from response:', usersResponse.users.length, 'users');
        setUsers(usersResponse.users);
      } else if (usersResponse && Array.isArray(usersResponse)) {
        console.log('Setting users from direct array:', usersResponse.length, 'users');
        setUsers(usersResponse);
      } else {
        console.warn('No users found in response:', usersResponse);
        setUsers([]);
      }

      await loadMeetingsForMonth();
      await loadAllMeetingsForCalendar(); // Load all meetings for calendar
    } catch (error) {
      console.error('Error loading initial data:', error);
      setError('Failed to load meeting data: ' + error.message);
      // Set empty arrays on error
      setEvents([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // Load ALL meetings for calendar (no date restrictions)
  const loadAllMeetingsForCalendar = async () => {
    try {
      console.log('[MeetingCalendar] Loading ALL meetings for calendar view...');
      
      const meetingsResponse = await meetingService.getAllMeetings({
        limit: 1000 // Get all meetings without date restriction
      });
      
      console.log('[MeetingCalendar] All meetings API response for calendar:', meetingsResponse);
      
      // Try different response structures
      let allMeetingsData = [];
      
      if (meetingsResponse && meetingsResponse.success && meetingsResponse.meetings) {
        allMeetingsData = meetingsResponse.meetings;
        console.log('[MeetingCalendar] ✅ Found all meetings in response.meetings');
      } else if (meetingsResponse && meetingsResponse.meetings) {
        allMeetingsData = meetingsResponse.meetings;
        console.log('[MeetingCalendar] ✅ Found all meetings without success flag');
      } else if (meetingsResponse && Array.isArray(meetingsResponse)) {
        allMeetingsData = meetingsResponse;
        console.log('[MeetingCalendar] ✅ All meetings response is direct array');
      } else if (meetingsResponse && meetingsResponse.data && Array.isArray(meetingsResponse.data)) {
        allMeetingsData = meetingsResponse.data;
        console.log('[MeetingCalendar] ✅ Found all meetings in response.data');
      }
      
      console.log('[MeetingCalendar] ALL meetings loaded for calendar:', allMeetingsData.length, 'meetings');
      setAllMeetings(allMeetingsData || []);
      
    } catch (error) {
      console.error('[MeetingCalendar] Error loading all meetings for calendar:', error);
      setAllMeetings([]);
    }
  };

  const loadMeetingsForMonth = async () => {
    try {
      console.log('[MeetingCalendar] Loading meetings for date range:', dateRange.startDate, 'to', dateRange.endDate);
      
      try {
        console.log('[MeetingCalendar] Calling getAllMeetings with date range filter...');
        const meetingsResponse = await meetingService.getAllMeetings({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          limit: 100
        });
        
        console.log('[MeetingCalendar] API response:', meetingsResponse);
        console.log('[MeetingCalendar] Response type:', typeof meetingsResponse);
        console.log('[MeetingCalendar] Response keys:', meetingsResponse ? Object.keys(meetingsResponse) : 'null response');
        
        // Try different response structures
        let meetingsData = [];
        
        if (meetingsResponse && meetingsResponse.success && meetingsResponse.meetings) {
          meetingsData = meetingsResponse.meetings;
          console.log('[MeetingCalendar] ✅ Found meetings in response.meetings');
        } else if (meetingsResponse && meetingsResponse.meetings) {
          meetingsData = meetingsResponse.meetings;
          console.log('[MeetingCalendar] ✅ Found meetings without success flag');
        } else if (meetingsResponse && Array.isArray(meetingsResponse)) {
          meetingsData = meetingsResponse;
          console.log('[MeetingCalendar] ✅ Response is direct array');
        } else if (meetingsResponse && meetingsResponse.data && Array.isArray(meetingsResponse.data)) {
          meetingsData = meetingsResponse.data;
          console.log('[MeetingCalendar] ✅ Found meetings in response.data');
        } else {
          console.log('[MeetingCalendar] ❌ No meetings found in any expected format');
          console.log('[MeetingCalendar] Full response structure:', JSON.stringify(meetingsResponse, null, 2));
        }
        
        console.log('[MeetingCalendar] Meetings data extracted:', meetingsData);
        console.log('[MeetingCalendar] Total meetings found:', meetingsData.length);
        
        if (meetingsData.length > 0) {
          console.log('[MeetingCalendar] Sample meeting:', JSON.stringify(meetingsData[0], null, 2));
        }
        
        setMeetings(meetingsData || []);
        
        if (meetingsData && meetingsData.length > 0) {
          console.log('[MeetingCalendar] ✅ Successfully loaded', meetingsData.length, 'meetings');
        } else {
          console.log('[MeetingCalendar] ⚠️ No meetings returned from API for date range');
        }
        
      } catch (error) {
        console.error('[MeetingCalendar] ❌ getAllMeetings failed:', error);
        console.error('[MeetingCalendar] Error details:', error.message);
        setMeetings([]);
        setError('Failed to load meetings: ' + error.message);
      }
      
    } catch (error) {
      console.error('[MeetingCalendar] ❌ Overall error:', error);
      setMeetings([]);
      setError('Failed to load meetings: ' + error.message);
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
  
  // Check if a day is in the past
  const isPastDate = (day) => {
    const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return selectedDate < today;
  };

  const handleDateClick = (day) => {
    // Block past dates
    if (isPastDate(day)) {
      alert('Cannot schedule meetings for past dates.');
      return;
    }
    
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(clickedDate);
    
    // Set the date in the meeting form and reset form with default time
    const formattedDate = clickedDate.toISOString().split('T')[0];
    setMeetingData({
      title: '',
      description: '',
      eventId: '',
      meetingDate: formattedDate, // Automatically set the clicked date
      meetingTime: '10:00', // Default time
      meetingUrl: '',
      guestUserIds: []
    });
    
    setEditingMeeting(null);
    setSelectedGuests([]);
    setSelectedGuestId('');
    setShowMeetingModal(true);
  };

  const handleEditMeeting = (meeting) => {
    const meetingDate = new Date(meeting.meetingDate || meeting.start);
    
    setMeetingData({
      title: meeting.title,
      description: meeting.description || '',
      eventId: meeting.eventId || meeting.event?.id || '',
      meetingDate: meetingDate.toISOString().split('T')[0],
      meetingTime: meetingDate.toTimeString().slice(0, 5),
      meetingUrl: meeting.meetingUrl || '',
      guestUserIds: meeting.guests?.map(g => g.id) || []
    });

    // Set selected guests for editing
    const guestsList = meeting.guests || [];
    setSelectedGuests(guestsList.map(guest => ({
      id: guest.id,
      name: guest.name,
      designation: guest.designation || guest.role,
      department: guest.department?.name || 'No Department'
    })));
    setSelectedGuestId('');
    
    setEditingMeeting(meeting);
    setShowMeetingModal(true);
  };

  const handleMeetingClick = (meeting) => {
    console.log('Meeting clicked from calendar:', meeting);
    
    // Auto-select the event data and open modal for editing
    const meetingDate = new Date(meeting.meetingDate || meeting.start);
    
    // Pre-fill form with meeting data
    setMeetingData({
      title: meeting.title || '',
      description: meeting.description || '',
      eventId: meeting.eventId || meeting.event?.id || '',
      meetingDate: meetingDate.toISOString().split('T')[0],
      meetingTime: meetingDate.toTimeString().slice(0, 5),
      meetingUrl: meeting.meetingUrl || '',
      guestUserIds: meeting.guests?.map(g => g.id) || []
    });

    // Set selected guests
    const guestsList = meeting.guests || [];
    setSelectedGuests(guestsList.map(guest => ({
      id: guest.id,
      name: guest.name,
      designation: guest.designation || guest.role || '',
      department: guest.department?.name || 'No Department'
    })));
    setSelectedGuestId('');
    
    // Set editing mode
    setEditingMeeting(meeting);
    setShowMeetingModal(true);
    
    console.log('Auto-selected event ID:', meeting.eventId || meeting.event?.id);
  };

  const handleDeleteMeeting = async (meetingId) => {
    if (!confirm('Are you sure you want to delete this meeting?')) {
      return;
    }

    try {
      setLoading(true);
      await meetingService.deleteMeeting(meetingId);
      setSuccess('Meeting deleted successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
      await loadMeetingsForMonth(); // Refresh filtered meetings for list
      await loadAllMeetingsForCalendar(); // Refresh all meetings for calendar
    } catch (error) {
      console.error('Error deleting meeting:', error);
      setError('Failed to delete meeting: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setMeetingData({
      ...meetingData,
      [name]: value
    });
  };
  
  // Handle direct guest selection from dropdown
  const handleGuestSelect = (e) => {
    const userId = e.target.value;
    if (!userId) return;
    
    const user = users.find(u => u.id.toString() === userId);
    if (!user) return;
    
    // Check if guest is already added
    if (selectedGuests.some(guest => guest.id.toString() === userId)) {
      alert('This person is already invited to the meeting.');
      setSelectedGuestId(''); // Reset dropdown
      return;
    }
    
    const newGuest = {
      id: user.id,
      name: user.name,
      email: user.email,
      designation: user.designation || user.role,
      department: user.department?.name || 'No Department'
    };
    
    setSelectedGuests([...selectedGuests, newGuest]);
    setSelectedGuestId(''); // Reset dropdown after adding
  };
  
  // Handle removing a guest
  const handleRemoveGuest = (guestId) => {
    setSelectedGuests(selectedGuests.filter(guest => guest.id !== guestId));
  };
  
  const handleMeetingSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      setError(null);

      // Validate date and time are provided
      if (!meetingData.meetingDate || !meetingData.meetingTime) {
        setError('Please provide both date and time for the meeting.');
        return;
      }

      // Create ISO datetime string properly (avoiding timezone issues)
      const dateTimeString = `${meetingData.meetingDate}T${meetingData.meetingTime}:00.000Z`;
      
      const submitData = {
        title: meetingData.title,
        description: meetingData.description,
        eventId: parseInt(meetingData.eventId),
        meetingDate: dateTimeString, // Format: "2023-07-25T14:00:00.000Z"
        meetingUrl: meetingData.meetingUrl,
        guestUserIds: selectedGuests.map(guest => guest.id)
      };

      // Validate meeting data before submitting
      const validation = meetingService.validateMeetingData(submitData);
      if (!validation.isValid) {
        setError('Validation errors: ' + validation.errors.join(', '));
        return;
      }

      console.log('Submitting meeting data:', submitData);

      let response;
      if (editingMeeting) {
        response = await meetingService.updateMeeting(editingMeeting.id, submitData);
        alert('Meeting updated successfully!');
      } else {
        response = await meetingService.createMeeting(submitData);
        alert('Meeting scheduled successfully!');
      }

      console.log('Meeting save response:', response);

      setShowMeetingModal(false);
      resetMeetingForm();
      
      // Show success message
      setSuccess(editingMeeting ? 'Meeting updated successfully!' : 'Meeting scheduled successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
      // Small delay to ensure backend has processed the meeting creation
      setTimeout(async () => {
        await loadMeetingsForMonth(); // Refresh filtered meetings for list
        await loadAllMeetingsForCalendar(); // Refresh all meetings for calendar
      }, 500);

    } catch (error) {
      console.error('Error saving meeting:', error);
      if (error.message.includes('not yet implemented')) {
        setError('Meeting API is not yet implemented in the backend. Please try again later.');
      } else {
        setError('Failed to save meeting: ' + error.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const resetMeetingForm = () => {
    setMeetingData({
      title: '',
      description: '',
      eventId: '',
      meetingDate: '',
      meetingTime: '',
      meetingUrl: '',
      guestUserIds: []
    });
    setSelectedGuests([]);
    setSelectedGuestId('');
    setEditingMeeting(null);
  };

  const handleCloseModal = () => {
    setShowMeetingModal(false);
    resetMeetingForm();
    setError(null);
  };

  // Get meetings for a specific day (use allMeetings for calendar)
  const getMeetingsForDay = (day) => {
    const dateString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Use allMeetings for calendar display to show ALL meetings
    const dayMeetings = allMeetings.filter(meeting => {
      const meetingDate = new Date(meeting.meetingDate || meeting.start);
      const meetingDateString = meetingDate.toISOString().split('T')[0];
      return meetingDateString === dateString;
    });
    
    return dayMeetings;
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
      const dayMeetings = getMeetingsForDay(day);
      const isDisabled = isPastDate(day);
      
      days.push(
        <div 
          key={day} 
          className={`calendar-day ${isDisabled ? 'disabled' : ''}`} 
          onClick={() => handleDateClick(day)}
          style={{
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: isDisabled ? 0.5 : 1,
            backgroundColor: isDisabled ? '#f5f5f5' : ''
          }}
        >
          <div className="day-number">{day}</div>
          {dayMeetings.map((meeting, index) => {
            const meetingTime = new Date(meeting.meetingDate || meeting.start);
            return (
              <div 
                key={index} 
                className="event-indicator meeting-event"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent day click
                  handleMeetingClick(meeting);
                }}
                style={{ cursor: 'pointer' }}
                title="Click to edit meeting"
              >
                {meetingTime.toTimeString().slice(0, 5)} - {meeting.title}
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
      
      // Apply participant filter
      if (meetingListFilters.participantFilter) {
        const hasParticipant = meeting.guests && Array.isArray(meeting.guests) && 
          meeting.guests.some(guest => {
            const name = guest.name || guest.fullName || '';
            const email = guest.email || '';
            return name.toLowerCase().includes(meetingListFilters.participantFilter.toLowerCase()) ||
                   email.toLowerCase().includes(meetingListFilters.participantFilter.toLowerCase());
          });
        if (!hasParticipant) return false;
      }
      
      return true;
    });
  };



  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading meeting calendar...</p>
      </div>
    );
  }

  return (
    <div className="content-wrapper" style={{ padding: '2rem', margin: '0 2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>Schedule and manage meetings for your events</h2>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  resetMeetingForm();
                  setShowMeetingModal(true);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#4f46e5',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                + Schedule New Meeting
              </button>
            </div>

            {error && (
              <div className="alert alert-error" style={{ 
                padding: '0.75rem 1rem',
                backgroundColor: '#fee2e2',
                color: '#b91c1c',
                borderRadius: '8px',
                marginBottom: '1.5rem' 
              }}>
                <span>{error}</span>
                <button 
                  className="alert-close" 
                  onClick={() => setError(null)}
                  style={{ marginLeft: '1rem', background: 'none', border: 'none', fontSize: '1.2rem' }}
                >
                  ×
                </button>
              </div>
            )}

            {success && (
              <div className="alert alert-success" style={{ 
                padding: '0.75rem 1rem',
                backgroundColor: '#dcfce7',
                color: '#15803d',
                borderRadius: '8px',
                marginBottom: '1.5rem' 
              }}>
                <span>{success}</span>
                <button 
                  className="alert-close" 
                  onClick={() => setSuccess(null)}
                  style={{ marginLeft: '1rem', background: 'none', border: 'none', fontSize: '1.2rem' }}
                >
                  ×
                </button>
              </div>
            )}

            <div className="calendar-container">
        <div className="calendar-header">
          <div className="calendar-title">
            {getMonthName(currentMonth)} {currentMonth.getFullYear()}
            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', marginTop: '0.25rem' }}>
              {loading ? 'Loading company meetings...' : `${allMeetings.length} total meeting${allMeetings.length === 1 ? '' : 's'} in database`}
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
      
      {/* Upcoming meetings list */}
      <div className="card" style={{ marginTop: '2rem' }}>
        <div className="card-header">
          <h2>Meetings List</h2>
          
          {/* Enhanced Filters for Meeting List */}
          <div style={{ 
            display: 'flex', 
            gap: '0.75rem', 
            alignItems: 'center', 
            flexWrap: 'wrap',
            marginTop: '1rem',
            padding: '1rem',
            background: '#f8f9fa',
            borderRadius: '6px',
            border: '1px solid #e9ecef'
          }}>
            {/* Date Range */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500', color: '#495057', fontSize: '0.875rem' }}>From:</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500', color: '#495057', fontSize: '0.875rem' }}>To:</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            
            {/* Status Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500', color: '#495057', fontSize: '0.875rem' }}>Status:</label>
              <select
                value={meetingListFilters.statusFilter}
                onChange={(e) => setMeetingListFilters(prev => ({ ...prev, statusFilter: e.target.value }))}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  background: 'white'
                }}
              >
                <option value="all">All Meetings</option>
                <option value="upcoming">Upcoming</option>
                <option value="today">Today</option>
                <option value="this-week">This Week</option>
                <option value="past">Past</option>
              </select>
            </div>
            
            {/* Event Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500', color: '#495057', fontSize: '0.875rem' }}>Event:</label>
              <input
                type="text"
                placeholder="Filter by event..."
                value={meetingListFilters.eventFilter}
                onChange={(e) => setMeetingListFilters(prev => ({ ...prev, eventFilter: e.target.value }))}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  width: '150px'
                }}
              />
            </div>
            
            {/* Participant Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontWeight: '500', color: '#495057', fontSize: '0.875rem' }}>Participant:</label>
              <input
                type="text"
                placeholder="Filter by participant..."
                value={meetingListFilters.participantFilter}
                onChange={(e) => setMeetingListFilters(prev => ({ ...prev, participantFilter: e.target.value }))}
                style={{
                  padding: '0.375rem 0.75rem',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  width: '150px'
                }}
              />
            </div>
            
            <button
              onClick={applyDateRangeFilter}
              disabled={loading}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '0.375rem 1rem',
                borderRadius: '4px',
                fontSize: '0.875rem',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              {loading ? 'Loading...' : 'Apply Filters'}
            </button>
            
            <div style={{ fontSize: '0.8rem', color: '#6c757d' }}>
              Found: {getFilteredMeetingsForList().length} meeting{getFilteredMeetingsForList().length === 1 ? '' : 's'}
            </div>
          </div>
        </div>
        {meetings.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: '280px' }}>Meeting Details</th>
                  <th style={{ minWidth: '250px' }}>Event Information</th>
                  <th style={{ minWidth: '140px' }}>Date & Time</th>
                  <th style={{ minWidth: '200px' }}>Participants</th>
                  <th style={{ minWidth: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredMeetingsForList()
                  .sort((a, b) => new Date(a.meetingDate || a.start) - new Date(b.meetingDate || b.start))
                  .map(meeting => {
                    const { date, time } = formatMeetingDateTime(meeting.meetingDate || meeting.start);
                    const event = meeting.event || {};
                    
                    return (
                      <tr key={meeting.id || meeting._id || Math.random()}>
                        <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                          <div style={{ marginBottom: '0.5rem' }}>
                            <strong style={{ fontSize: '1rem', color: '#111827' }}>
                              {meeting.title || meeting.name || 'Untitled Meeting'}
                            </strong>
                          </div>
                          
                          {meeting.description && (
                            <div style={{ 
                              fontSize: '0.85rem', 
                              color: '#6b7280', 
                              marginBottom: '0.5rem',
                              lineHeight: '1.4'
                            }}>
                              📝 {meeting.description}
                            </div>
                          )}
                          
                          {meeting.meetingUrl && (
                            <div style={{ marginTop: '0.5rem' }}>
                              <a 
                                href={meeting.meetingUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                style={{
                                  color: '#3b82f6',
                                  textDecoration: 'none',
                                  fontSize: '0.875rem',
                                  fontWeight: '500',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem'
                                }}
                              >
                                🔗 Join Meeting
                              </a>
                            </div>
                          )}
                          
                          <div style={{ 
                            marginTop: '0.5rem', 
                            fontSize: '0.75rem', 
                            color: '#9ca3af'
                          }}>
                            ID: {meeting.id || 'N/A'}
                          </div>
                        </td>
                        
                        <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                          <div style={{ marginBottom: '0.5rem' }}>
                            <span style={{
                              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                              color: 'white',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.8rem',
                              fontWeight: '500'
                            }}>
                              {meeting.eventName || event.name || 'No Event Linked'}
                            </span>
                          </div>
                          
                          {event.description && (
                            <div style={{ 
                              fontSize: '0.8rem', 
                              color: '#6b7280', 
                              marginBottom: '0.5rem',
                              lineHeight: '1.3'
                            }}>
                              {event.description}
                            </div>
                          )}
                          
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.5rem' }}>
                            {event.department && (
                              <span style={{
                                fontSize: '0.75rem',
                                background: '#e0f2fe',
                                color: '#0369a1',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '4px',
                                fontWeight: '500'
                              }}>
                                🏢 {event.department.name || event.department}
                              </span>
                            )}
                            
                            {event.priority && (
                              <span style={{
                                fontSize: '0.75rem',
                                background: event.priority === 'High' ? '#fee2e2' : 
                                           event.priority === 'Medium' ? '#fef3c7' : '#dcfce7',
                                color: event.priority === 'High' ? '#dc2626' : 
                                       event.priority === 'Medium' ? '#d97706' : '#16a34a',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '4px',
                                fontWeight: '500'
                              }}>
                                ⚡ {event.priority}
                              </span>
                            )}
                            
                            {event.status && (
                              <span style={{
                                fontSize: '0.75rem',
                                background: event.status === 'approved' ? '#dcfce7' : 
                                           event.status === 'pending' ? '#fef3c7' : '#fee2e2',
                                color: event.status === 'approved' ? '#15803d' : 
                                       event.status === 'pending' ? '#d97706' : '#dc2626',
                                padding: '0.125rem 0.5rem',
                                borderRadius: '4px',
                                fontWeight: '500'
                              }}>
                                {event.status === 'approved' ? '✅' : 
                                 event.status === 'pending' ? '⏳' : '❌'} {event.status}
                              </span>
                            )}
                          </div>
                        </td>
                        
                        <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                          <div style={{ fontWeight: '600', color: '#111827', marginBottom: '0.25rem' }}>
                            📅 {date}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                            🕒 {time}
                          </div>
                          
                          {/* Show if meeting is today or upcoming */}
                          {(() => {
                            const meetingDate = new Date(meeting.meetingDate || meeting.start);
                            const today = new Date();
                            const isToday = meetingDate.toDateString() === today.toDateString();
                            const daysDiff = Math.ceil((meetingDate - today) / (1000 * 60 * 60 * 24));
                            
                            if (isToday) {
                              return (
                                <div style={{ 
                                  fontSize: '0.75rem', 
                                  color: '#dc2626', 
                                  fontWeight: '600',
                                  marginTop: '0.25rem'
                                }}>
                                  🔴 Today
                                </div>
                              );
                            } else if (daysDiff === 1) {
                              return (
                                <div style={{ 
                                  fontSize: '0.75rem', 
                                  color: '#ea580c', 
                                  fontWeight: '600',
                                  marginTop: '0.25rem'
                                }}>
                                  🟡 Tomorrow
                                </div>
                              );
                            } else if (daysDiff > 1 && daysDiff <= 7) {
                              return (
                                <div style={{ 
                                  fontSize: '0.75rem', 
                                  color: '#16a34a', 
                                  fontWeight: '500',
                                  marginTop: '0.25rem'
                                }}>
                                  🟢 In {daysDiff} days
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </td>
                        
                        <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                          {meeting.guests && Array.isArray(meeting.guests) && meeting.guests.length > 0 ? (
                            <div>
                              <div style={{ 
                                fontSize: '0.85rem', 
                                fontWeight: '600', 
                                color: '#374151',
                                marginBottom: '0.5rem'
                              }}>
                                👥 {meeting.guests.length} participant{meeting.guests.length === 1 ? '' : 's'}
                              </div>
                              
                              <div style={{ 
                                maxHeight: '120px', 
                                overflowY: 'auto',
                                fontSize: '0.8rem',
                                lineHeight: '1.4'
                              }}>
                                {meeting.guests.map((guest, index) => (
                                  <div key={index} style={{ 
                                    padding: '0.25rem 0',
                                    borderBottom: index < meeting.guests.length - 1 ? '1px solid #f1f5f9' : 'none'
                                  }}>
                                    <div style={{ fontWeight: '500', color: '#374151' }}>
                                      {guest.name || guest.fullName || 'Unknown'}
                                    </div>
                                    {guest.email && (
                                      <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                                        📧 {guest.email}
                                      </div>
                                    )}
                                    {guest.designation && (
                                      <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                                        💼 {guest.designation}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div style={{ 
                              fontSize: '0.85rem', 
                              color: '#9ca3af',
                              fontStyle: 'italic',
                              textAlign: 'center',
                              padding: '1rem 0'
                            }}>
                              👤 No participants invited
                            </div>
                          )}
                        </td>
                        
                        <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              onClick={() => handleEditMeeting(meeting)}
                              title="Edit meeting"
                              style={{
                                fontSize: '0.8rem',
                                padding: '0.5rem 0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              className="btn btn-danger btn-sm" 
                              onClick={() => handleDeleteMeeting(meeting.id || meeting._id)}
                              title="Delete meeting"
                              style={{
                                fontSize: '0.8rem',
                                padding: '0.5rem 0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card-body" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
            <h3 style={{ color: '#374151', marginBottom: '0.5rem' }}>No Meetings Found</h3>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              {loading ? 'Loading meetings...' : 
               `No meetings found for the selected criteria. Total meetings loaded: ${meetings.length}, after filters: ${getFilteredMeetingsForList().length}`}
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => {
                resetMeetingForm();
                setShowMeetingModal(true);
              }}
            >
              Schedule New Meeting
            </button>
            <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: '#9ca3af' }}>
              <p>💡 Tips:</p>
              <p>• Try adjusting the date range to see more meetings</p>
              <p>• Make sure you have events created for your company first</p>
              <p>• Meetings are filtered by your company automatically</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Meeting scheduling modal */}
      {showMeetingModal && (
        <div className="meeting-modal">
          <div className="modal-backdrop" onClick={handleCloseModal}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingMeeting ? 'Edit Meeting' : 'Schedule a Meeting'}</h3>
              <button className="modal-close" onClick={handleCloseModal}>×</button>
            </div>
            <div className="modal-body">
              {error && (
                <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
                  {error}
                </div>
              )}
              
              <form onSubmit={handleMeetingSubmit}>
                <div className="form-group">
                  <label htmlFor="title">Meeting Title *</label>
                  <input
                    id="title"
                    type="text"
                    name="title"
                    value={meetingData.title}
                    onChange={handleInputChange}
                    placeholder="Enter meeting title"
                    required
                    disabled={saving}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="eventId">Related Event *</label>
                  <select
                    id="eventId"
                    name="eventId"
                    value={meetingData.eventId}
                    onChange={handleInputChange}
                    required
                    disabled={saving}
                  >
                    <option value="">Select an event</option>
                    {events.map(event => (
                      <option key={event.id} value={event.id}>
                        {event.name} - {event.department?.name || 'All Departments'} 
                        {event.priority && ` (${event.priority})`}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                    Showing all events across the company
                  </small>
                </div>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="meetingDate">Date *</label>
                    <input
                      id="meetingDate"
                      type="date"
                      name="meetingDate"
                      value={meetingData.meetingDate}
                      onChange={handleInputChange}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      disabled={saving}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="meetingTime">Time *</label>
                    <input
                      id="meetingTime"
                      type="time"
                      name="meetingTime"
                      value={meetingData.meetingTime}
                      onChange={handleInputChange}
                      required
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="meetingUrl">Meeting URL</label>
                  <input
                    id="meetingUrl"
                    type="url"
                    name="meetingUrl"
                    value={meetingData.meetingUrl}
                    onChange={handleInputChange}
                    placeholder="https://zoom.us/j/123456789 or https://meet.google.com/abc-defg-hij"
                    disabled={saving}
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    name="description"
                    value={meetingData.description}
                    onChange={handleInputChange}
                    placeholder="Meeting agenda and details..."
                    rows="3"
                    disabled={saving}
                  ></textarea>
                </div>
                
                {/* Direct Guest Selection System */}
                <div className="form-group">
                  <label htmlFor="guestSelection">Invite Guests</label>
                  <select 
                    id="guestSelection"
                    value={selectedGuestId}
                    onChange={handleGuestSelect}
                    disabled={saving}
                  >
                    <option value="">Select a person to invite</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name || 'Unknown'} 
                        {user.email ? ` (${user.email})` : ''} 
                        {user.designation || user.role || user.department?.name ? ` - ${user.designation || user.role || user.department?.name}` : ''}
                      </option>
                    ))}
                  </select>
                  <small style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                    Select from dropdown to automatically add guests
                  </small>
                  
                  {/* Selected Guests List */}
                  {selectedGuests.length > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <strong style={{ fontSize: '0.9rem', color: '#374151' }}>
                        Invited Guests ({selectedGuests.length}):
                      </strong>
                      <div style={{ 
                        marginTop: '0.5rem', 
                        maxHeight: '120px', 
                        overflowY: 'auto',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        padding: '0.5rem'
                      }}>
                        {selectedGuests.map(guest => (
                          <div key={guest.id} style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            padding: '0.5rem',
                            marginBottom: '0.25rem',
                            backgroundColor: '#f9fafb',
                            borderRadius: '4px',
                            fontSize: '0.85rem'
                          }}>
                            <div>
                              <strong>{guest.name || 'Unknown'}</strong>
                              <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>
                                {guest.email && <span>{guest.email}</span>}
                                {(guest.designation || guest.department) && guest.email && <span> • </span>}
                                {guest.designation || guest.department || 'No designation'}
                              </div>
                            </div>
                            <button 
                              type="button"
                              onClick={() => handleRemoveGuest(guest.id)}
                              disabled={saving}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontSize: '1rem',
                                padding: '0.25rem'
                              }}
                              title="Remove guest"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={handleCloseModal}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : (editingMeeting ? 'Update Meeting' : 'Schedule Meeting')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
            )}
          </div>
  );
};

export default MeetingCalendar;
