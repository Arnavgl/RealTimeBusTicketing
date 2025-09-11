// File: frontend/src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import TripCard from '../components/TripCard';
import './HomePage.css';

const HomePage = () => {
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    axios.get('http://localhost:3001/api/trips')
      .then(response => {
        setTrips(response.data);
      })
      .catch(error => {
        console.error("Error fetching trip list:", error);
      });
  }, []);

  if (trips.length === 0) {
    return <div>Loading available trips...</div>;
  }

  return (
    <div className="homepage">
      <h2>Available Trips</h2>
      <div className="trip-list">
        {trips.map(trip => (
          <Link to={`/trip/${trip.id}`} key={trip.id} className="trip-link">
            <TripCard trip={trip} />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default HomePage;