import React, { useState } from 'react';

const TaskCalendar = () => {
  // State for calendar view
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Mock data for tasks
  const [tasks] = useState([
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

  // Get tasks for a specific day
  const getTasksForDay = (day) => {
    const dateString = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(task => task.dueDate === dateString);
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
      
      days.push(
        <div key={day} className="calendar-day" onClick={() => handleDateClick(day)}>
          <div className="day-number">{day}</div>
          {dayTasks.map((task, index) => (
            <div key={index} className="event-indicator">
              {task.title}
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
        <h1>Task Calendar</h1>
        <p>View your tasks in calendar format</p>
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
      
      {/* Task details section */}
      {selectedDate && (
        <div className="card" style={{ marginTop: '2rem' }}>
          <div className="card-header">
            <h2>Tasks for {selectedDate.toLocaleDateString()}</h2>
          </div>
          <div className="card-body">
            {getTasksForDay(selectedDate.getDate()).length > 0 ? (
              getTasksForDay(selectedDate.getDate()).map(task => (
                <div key={task.id} className="task-item" style={{ 
                  padding: '1rem', 
                  borderBottom: '1px solid #eee',
                  marginBottom: '0.5rem'
                }}>
                  <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{task.title}</div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: '#666' }}>
                    <div>Priority: {task.priority}</div>
                    <div>Status: {task.status}</div>
                    <div>Event: {task.event}</div>
                  </div>
                </div>
              ))
            ) : (
              <p>No tasks scheduled for this day.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCalendar;
