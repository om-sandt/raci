import React, { useState, useEffect } from 'react';

const MeetingCalendar = () => {
  // State for calendar view
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  
  // State for new meeting
  const [meetingData, setMeetingData] = useState({
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    description: '',
    attendees: []
  });
  
  // Mock data for events and attendees
  const [events, setEvents] = useState([
    {
      id: 1,
      title: 'Budget Planning Meeting',
      date: '2023-07-15',
      startTime: '10:00',
      endTime: '11:30',
      description: 'Discuss quarterly budget allocations',
      attendees: ['Alice Brown', 'Bob White', 'Charlie Green']
    },
    {
      id: 2,
      title: 'Product Review',
      date: '2023-07-22',
      startTime: '14:00',
      endTime: '15:00',
      description: 'Review new features and roadmap',
      attendees: ['Diana Black', 'Edward Grey']
    },
    {
      id: 3,
      title: 'Team Standup',
      date: '2023-07-10',
      startTime: '09:30',
      endTime: '10:00',
      description: 'Daily team standup',
      attendees: ['Alice Brown', 'Bob White', 'Charlie Green', 'Diana Black', 'Edward Grey']
    }
  ]);

  const employees = [
    { id: 1, name: 'Alice Brown', role: 'Finance Manager' },
    { id: 2, name: 'Bob White', role: 'Marketing Director' },
    { id: 3, name: 'Charlie Green', role: 'Product Manager' },
    { id: 4, name: 'Diana Black', role: 'HR Manager' },
    { id: 5, name: 'Edward Grey', role: 'IT Admin' },
    { id: 6, name: 'Fiona Blue', role: 'CEO' }
  ];
  
  // Helper functions for calendar
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return daysInMonth;
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
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(clickedDate);
    
    // Set the date in the meeting form
    const formattedDate = clickedDate.toISOString().split('T')[0];
    setMeetingData({
      ...meetingData,
      date: formattedDate
    });
    
    setShowMeetingModal(true);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setMeetingData({
      ...meetingData,
      [name]: value
    });
  };
  
  const handleAttendeesChange = (e) => {
    const selectedAttendees = Array.from(
      e.target.selectedOptions, 
      option => employees.find(emp => emp.id.toString() === option.value)?.name
    ).filter(Boolean);
    
    setMeetingData({
      ...meetingData,
      attendees: selectedAttendees
    });
  };
  
  const handleMeetingSubmit = (e) => {
    e.preventDefault();
    
    // Create new meeting
    const newMeeting = {
      id: events.length + 1,
      ...meetingData
    };
    
    setEvents([...events, newMeeting]);
    setShowMeetingModal(false);
    
    // Reset meeting data
    setMeetingData({
      title: '',
      date: '',
      startTime: '',
      endTime: '',
      description: '',
      attendees: []
    });
    
    alert('Meeting scheduled successfully!');
  };

  // Get events for a specific day
  const getEventsForDay = (day) => {
    const dateString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(event => event.date === dateString);
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
      const dayEvents = getEventsForDay(day);
      
      days.push(
        <div key={day} className="calendar-day" onClick={() => handleDateClick(day)}>
          <div className="day-number">{day}</div>
          {dayEvents.map((event, index) => (
            <div key={index} className="event-indicator">
              {event.startTime} - {event.title}
            </div>
          ))}
        </div>
      );
    }
    
    return days;
  };

  return (
    <div>
      <div className="page-header">
        <h1>Meeting Calendar</h1>
        <p>Schedule and manage meetings</p>
      </div>
      
      <div className="calendar-container">
        <div className="calendar-header">
          <div className="calendar-title">
            {getMonthName(currentMonth)} {currentMonth.getFullYear()}
          </div>
          <div className="calendar-nav">
            <button className="btn btn-secondary" onClick={prevMonth}>
              &lt; Previous
            </button>
            <button className="btn btn-secondary" onClick={nextMonth}>
              Next &gt;
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
          <h2>Upcoming Meetings</h2>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Meeting</th>
                <th>Date</th>
                <th>Time</th>
                <th>Attendees</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map(event => (
                <tr key={event.id}>
                  <td>
                    <strong>{event.title}</strong>
                    <div style={{ fontSize: '0.85rem', color: '#64748b' }}>{event.description}</div>
                  </td>
                  <td>{event.date}</td>
                  <td>{event.startTime} - {event.endTime}</td>
                  <td>
                    <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {event.attendees.join(', ')}
                    </div>
                  </td>
                  <td>
                    <button className="btn btn-secondary" style={{ padding: '0.4rem 0.7rem', fontSize: '0.85rem' }}>
                      Edit
                    </button>
                    <button className="btn btn-danger" style={{ padding: '0.4rem 0.7rem', fontSize: '0.85rem', marginLeft: '0.5rem' }}>
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Meeting scheduling modal */}
      {showMeetingModal && (
        <div className="meeting-modal">
          <div className="modal-backdrop" onClick={() => setShowMeetingModal(false)}></div>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Schedule a Meeting</h3>
            </div>
            <div className="modal-body">
              <form onSubmit={handleMeetingSubmit}>
                <div className="form-group">
                  <label>Meeting Title</label>
                  <input
                    type="text"
                    name="title"
                    value={meetingData.title}
                    onChange={handleInputChange}
                    placeholder="Enter meeting title"
                    required
                  />
                </div>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label>Date</label>
                    <input
                      type="date"
                      name="date"
                      value={meetingData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Start Time</label>
                    <input
                      type="time"
                      name="startTime"
                      value={meetingData.startTime}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>End Time</label>
                    <input
                      type="time"
                      name="endTime"
                      value={meetingData.endTime}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={meetingData.description}
                    onChange={handleInputChange}
                    placeholder="Meeting details..."
                    rows="3"
                  ></textarea>
                </div>
                
                <div className="form-group">
                  <label>Attendees</label>
                  <select 
                    multiple
                    onChange={handleAttendeesChange}
                    style={{ height: '120px' }}
                  >
                    {employees.map(employee => (
                      <option key={employee.id} value={employee.id}>
                        {employee.name} ({employee.role})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowMeetingModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Schedule Meeting
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
