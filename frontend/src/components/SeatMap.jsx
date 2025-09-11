// File: frontend/src/components/SeatMap.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Seat from "./Seat";
import "./SeatMap.css";

const HOLD_DURATION_SECONDS = 20;

const SeatMap = () => {
  const [trip, setTrip] = useState(null);
  // This is the NEW state initializer
  const [heldSeats, setHeldSeats] = useState(() => {
    const savedSeats = sessionStorage.getItem("heldSeats");
    return savedSeats ? JSON.parse(savedSeats) : [];
  });
  // NEW timeLeft state
  const [timeLeft, setTimeLeft] = useState(() => {
    const expiry = sessionStorage.getItem("holdExpiry");
    if (!expiry) return 0;
    // Calculate remaining seconds from the saved deadline
    const remaining = Math.round((parseInt(expiry) - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  });

  const navigate = useNavigate();

  useEffect(() => {
    // ... (This useEffect for fetching data and the one for WebSockets are UNCHANGED)
    axios
      .get("http://localhost:3001/api/trips/1")
      .then((res) => setTrip(res.data));
    const socket = new WebSocket("ws://localhost:3001");
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "SEAT_UPDATE") {
        setTrip((c) => ({
          ...c,
          Seats: c.Seats.map((s) =>
            s.id === data.payload.id ? data.payload : s
          ),
        }));
      }
    };
    return () => socket.close();
  }, []);

  // useEffect(() => {
  //   // ... (This useEffect for the timer is UNCHANGED)
  //   if (timeLeft > 0) {
  //     const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
  //     return () => clearTimeout(timerId);
  //   } else if (heldSeats.length > 0) {
  //     const releasePromises = heldSeats.map((seat) =>
  //       axios.post("http://localhost:3001/api/seats/release", {
  //         seatId: seat.id,
  //       })
  //     );
  //     Promise.all(releasePromises).finally(() => setHeldSeats([]));
  //   }
  // }, [timeLeft]);

  useEffect(() => {
    // If timer is still running, just count down.
    if (timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    }

    // When timer hits 0 AND there are held seats...
    if (timeLeft === 0 && heldSeats.length > 0) {
      console.log("Hold timer expired. Releasing seats...");

      const releasePromises = heldSeats.map((seat) =>
        axios.post("http://localhost:3001/api/seats/release", {
          seatId: seat.id,
        })
      );

      // After attempting to release, clear everything.
      Promise.all(releasePromises)
        .catch((err) =>
          console.error("An error occurred during auto-release:", err)
        )
        .finally(() => {
          setHeldSeats([]); // Clear the held seats from the UI
          sessionStorage.removeItem("holdExpiry"); // Clear the deadline
        });
    }
  }, [timeLeft]); // Dependency array should be just timeLeft

  // Add this new useEffect to SeatMap.jsx
  useEffect(() => {
    // Every time heldSeats changes, save it to session storage.
    sessionStorage.setItem("heldSeats", JSON.stringify(heldSeats));
  }, [heldSeats]);

  const handleSeatClick = async (seat) => {
    const isAlreadyHeld = heldSeats.some((s) => s.id === seat.id);

    if (isAlreadyHeld) {
      // --- DESELECT SEAT ---
      try {
        await axios.post("http://localhost:3001/api/seats/release", {
          seatId: seat.id,
        });
        const updatedSeats = heldSeats.filter((s) => s.id !== seat.id);
        setHeldSeats(updatedSeats);

        // If the user deselects their last seat, stop the timer
        if (updatedSeats.length === 0) {
          setTimeLeft(0);
          sessionStorage.removeItem("holdExpiry");
        }
      } catch (error) {
        alert(
          `Could not release seat: ${
            error.response?.data?.message || "Server error"
          }`
        );
      }
    } else {
      // --- SELECT SEAT ---
      if (seat.status === "available") {
        try {
          await axios.post("http://localhost:3001/api/seats/hold", {
            seatId: seat.id,
          });
          setHeldSeats((current) => [...current, seat]);

          // Start the timer and set the deadline only when the first seat is selected
          if (heldSeats.length === 0) {
            const expiryTimestamp = Date.now() + HOLD_DURATION_SECONDS * 1000;
            sessionStorage.setItem("holdExpiry", expiryTimestamp);
            setTimeLeft(HOLD_DURATION_SECONDS);
          }
        } catch (error) {
          alert(
            `Could not hold seat: ${
              error.response?.data?.message || "Server error"
            }`
          );
        }
      }
    }
  };

  // const handleSeatClick = async (seat) => {
  //   // ... (This function is UNCHANGED)
  //   const isAlreadyHeld = heldSeats.some((s) => s.id === seat.id);
  //   if (isAlreadyHeld) {
  //     await axios.post("http://localhost:3001/api/seats/release", {
  //       seatId: seat.id,
  //     });
  //     setHeldSeats((current) => current.filter((s) => s.id !== seat.id));
  //   // } else if (seat.status === "available") {
  //     // await axios.post("http://localhost:3001/api/seats/hold", {
  //       // seatId: seat.id,
  //     // });
  //     // setHeldSeats((current) => [...current, seat]);
  //     // if (heldSeats.length === 0) setTimeLeft(HOLD_DURATION_SECONDS);

  //     } else if (seat.status === 'available') {
  //       try {
  //         await axios.post('http://localhost:3001/api/seats/hold', {
  //           seatId: seat.id
  //         });
  //         setHeldSeats(current => [...current, seat]);
  //         // Start the timer only when the first seat is selected
  //         if (heldSeats.length === 0) {
  //           const expiryTimestamp = Date.now() + HOLD_DURATION_SECONDS * 1000;
  //           sessionStorage.setItem('holdExpiry', expiryTimestamp); // <-- NEW: Save the deadline
  //           setTimeLeft(HOLD_DURATION_SECONDS);
  //         }
  //       } catch (error) {

  //   }

  // };

  const handleProceedToCheckout = () => {
    navigate("/checkout", { state: { heldSeats, timeLeft } });
  };

  if (!trip) return <div>Loading Seat Map...</div>;

  // Add this line inside SeatMap.jsx, before the return statement
  const totalPrice = heldSeats.reduce((total, seat) => total + seat.price, 0);
  const formatTime = (seconds) =>
    `${Math.floor(seconds / 60)}:${("0" + (seconds % 60)).slice(-2)}`;

  return (
    <div className="seat-map-container">
      <h2>{trip.routeName}</h2>
      <div className="seat-map">
        {trip.Seats.map((seat) => {
          const isHeldByCurrentUser = heldSeats.some((s) => s.id === seat.id);
          return (
            <Seat
              key={seat.id}
              seatInfo={seat}
              isHeldByCurrentUser={isHeldByCurrentUser}
              onClick={handleSeatClick}
            />
          );
        })}
      </div>

      {heldSeats.length > 0 && (
        <div className="proceed-container">
          <p>
            {heldSeats.length} seats selected | Total: ₹{totalPrice.toFixed(2)}
          </p>
          <p>Time left to book: {formatTime(timeLeft)}</p>
          <button onClick={handleProceedToCheckout} className="proceed-button">
            Proceed to Checkout
          </button>
        </div>
      )}
    </div>
  );
};

export default SeatMap;
