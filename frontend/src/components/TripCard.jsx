// File: frontend/src/components/TripCard.jsx
import React from 'react';
import './TripCard.css';

const TripCard = ({ trip }) => {
  // Helper function to format date and time nicely
  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });
  };

  return (
    <div className="trip-card">
      <div className="card-header">
        <h3>{trip.busName}</h3>
        <p className="price">Seats from ₹650.00</p>
      </div>
      <div className="card-body">
        <div className="route">
          <p><strong>From:</strong> {trip.source}</p>
          <p><strong>To:</strong> {trip.destination}</p>
        </div>
        <div className="timings">
          <p><strong>Depart:</strong> {formatDateTime(trip.departureTime)}</p>
          <p><strong>Arrive:</strong> {formatDateTime(trip.arrivalTime)}</p>
        </div>
      </div>
    </div>
  );
};

export default TripCard;