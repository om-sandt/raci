import React from 'react';
import { Link } from 'react-router-dom';

const EventDetails = ({ event, handleViewRaciMatrix }) => {
  return (
    <div className="event-details">
      <h1>{event.name}</h1>
      <p>{event.description}</p>

      {event.hasRaciMatrix ? (
        <div className="raci-section">
          <h2>RACI Matrix</h2>
          
          <div className="button-group">
            <Link to={`/company-admin/events/${event.id}/raci/edit`} className="btn btn-secondary">
              Edit RACI Matrix
            </Link>
            <button onClick={handleViewRaciMatrix} className="btn btn-primary">
              View RACI Matrix
            </button>
          </div>
          
          {/* RACI summary information here */}
        </div>
      ) : (
        <div className="raci-section">
          <h2>RACI Matrix</h2>
          <p>No RACI matrix defined for this event.</p>
          <Link to={`/company-admin/events/${event.id}/raci`} className="btn btn-primary">
            Create RACI Matrix
          </Link>
        </div>
      )}
    </div>
  );
};

export default EventDetails;