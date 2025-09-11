// File: frontend/src/components/Seat.jsx
import React from 'react';
import './Seat.css';

// Added isHeldByCurrentUser prop
const Seat = ({ seatInfo, isHeldByCurrentUser, onClick }) => {
  // Add the 'user-held' class if this prop is true
  const classNames = `seat ${seatInfo.status} ${isHeldByCurrentUser ? 'user-held' : ''}`;

  return (
    <div 
      className={classNames}
      onClick={() => onClick(seatInfo)}
    >
      {seatInfo.seatNumber}
    </div>
  );
};

export default Seat;