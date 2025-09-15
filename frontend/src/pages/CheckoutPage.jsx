// File: frontend/src/pages/CheckoutPage.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
// import axios from "axios";
import api from '../api';
import "./CheckoutPage.css";

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // const { heldSeats, timeLeft: initialTimeLeft } = location.state || {
  //   heldSeats: [],
  //   initialTimeLeft: 0,
  // };

  // First, get the trip object from location.state at the top of the component
  const {
    heldSeats,
    timeLeft: initialTimeLeft,
    trip,
  } = location.state || { heldSeats: [], initialTimeLeft: 0, trip: null };

  const [timeLeft, setTimeLeft] = useState(initialTimeLeft);
  const [email, setEmail] = useState("");

  // This is the NEW timer effect in CheckoutPage.jsx
  useEffect(() => {
    // If timer is still running, just count down.
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }

    // When timer hits 0, release the seats and then navigate.
    if (timeLeft === 0 && heldSeats.length > 0) {
      console.log("Checkout timer expired. Releasing seats...");
      const releasePromises = heldSeats.map((seat) =>
        api.post("/api/seats/release", {
          seatId: seat.id,
        })
      );
      // After attempting to release, navigate back home.
      Promise.all(releasePromises).finally(() => navigate("/"));
    }

    // If there are no seats to begin with, just go home.
    if (heldSeats.length === 0) {
      navigate("/");
    }
  }, [timeLeft, heldSeats, navigate]);

  const handlePurchase = async () => {
    const seatIds = heldSeats.map((s) => s.id);
    if (!email) {
      alert("Please enter your email address.");
      return;
    }
    try {
      await api.post('/api/seats/purchase', {
        seatIds,
        email,
      });
      alert(`Purchase successful! A confirmation has been sent to ${email}.`);
      sessionStorage.removeItem("heldSeats"); // <-- NEW: Clear the storage
      sessionStorage.removeItem("holdExpiry"); // <-- NEW: Clear the deadline
      navigate("/"); // Go back to the home page after purchase
    } catch (error) {
      alert(`Purchase failed: ${error.response.data.message}`);
    }
  };

  const formatTime = (seconds) =>
    `${Math.floor(seconds / 60)}:${("0" + (seconds % 60)).slice(-2)}`;
  const totalPrice = heldSeats.reduce((total, seat) => total + seat.price, 0);

  return (
    <div className="checkout-page">
      <h2> Confirm Your Booking </h2>{" "}
      <div className="booking-summary">
          {trip && (
              <div className="trip-info-summary">
                  <p><strong>Bus:</strong> {trip.busName}</p>
                  <p><strong>Route:</strong> {trip.source} to {trip.destination}</p>
              </div>
          )}
          <p><strong>Seats:</strong> {heldSeats.map(s => s.seatNumber).join(', ')}</p>
          <p><strong>Total Price:</strong> ₹{totalPrice.toFixed(2)}</p>
          <p className="timer"><strong>Time Left:</strong> {formatTime(timeLeft)}</p>
      </div>
      {/* <div className="booking-summary">
        <p>
          {" "}
          <strong> Seats: </strong>{" "}
          {heldSeats.map((s) => s.seatNumber).join(", ")}
        </p>
        <p>
          {" "}
          <strong> Total Price: </strong> ₹{totalPrice.toFixed(2)}
        </p>
        <p className="timer">
          {" "}
          <strong> Time Left: </strong> {formatTime(timeLeft)}
        </p>
      </div> */}
      {" "}
      <div className="email-form">
        <label htmlFor="email"> Email for Confirmation: </label>{" "}
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your.email@example.com"
        />
      </div>{" "}
      <button onClick={() => navigate(-1)} className="back-button">
        &larr; Modify Selection
      </button>
      <button onClick={handlePurchase} className="purchase-button">
        Confirm & Pay{" "}
      </button>{" "}
    </div>
  );
};

export default CheckoutPage;
