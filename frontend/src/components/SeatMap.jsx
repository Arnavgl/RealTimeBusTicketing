// File: frontend/src/components/SeatMap.jsx
import React, { useState, useEffect } from "react";
// import axios from "axios";
import api from '../api';
import { useNavigate, useParams } from "react-router-dom"; // <-- NEW: Import useParams
import { toast } from "react-toastify";
import Seat from "./Seat";
import "./SeatMap.css";

const HOLD_DURATION_SECONDS = 20;

const SeatMap = () => {
  const { tripId } = useParams(); // <-- NEW: Get the tripId from the URL
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

  // Effect 1: For fetching initial trip data
  useEffect(() => {
    // NEW: Use the dynamic tripId in the API call
    api.get(`/api/trips/${tripId}`)
    // axios
    //   .get(`http://localhost:3001/api/trips/${tripId}`)
      .then((res) => {
        setTrip(res.data);
      })
      .catch((err) => {
        console.error("Failed to fetch trip data:", err);
        toast.error("Could not load seat map. Is the server running?");
      });
  }, [tripId]); // NEW: Add tripId as a dependency

  // // ADD THIS NEW useEffect FOR FETCHING DATA
  // useEffect(() => {
  //   axios
  //     .get("http://localhost:3001/api/trips/1")
  //     .then((res) => {
  //       setTrip(res.data);
  //     })
  //     .catch((err) => {
  //       console.error("Failed to fetch trip data:", err);
  //       toast.error("Could not load seat map. Is the server running?");
  //     });
  // }, []); // Empty array means it runs only once when the component loads

  // REPLACE your old useEffect with this one for WebSockets & Notifications
  useEffect(() => {
    const socket = new WebSocket("ws://localhost:3001");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "SEAT_UPDATE") {
        const updatedSeat = data.payload;

        if (updatedSeat.status === "held") {
          toast.info(`Seat ${updatedSeat.seatNumber} was just held!`);
        } else if (updatedSeat.status === "sold") {
          toast.success(`Seat ${updatedSeat.seatNumber} was just sold!`);
        } else if (updatedSeat.status === "available") {
          toast.warn(`Seat ${updatedSeat.seatNumber} is now available again!`);
        }

        setTrip((currentTrip) => ({
          ...currentTrip,
          Seats: currentTrip.Seats.map((seat) =>
            seat.id === updatedSeat.id ? updatedSeat : seat
          ),
        }));
      }
    };

    // Cleanup the socket connection when the component unmounts
    return () => socket.close();
  }, []); // This also runs only once

  // useEffect(() => {
  //   const socket = new WebSocket("ws://localhost:3001");

  //   socket.onmessage = (event) => {
  //     const data = JSON.parse(event.data);
  //     if (data.type === "SEAT_UPDATE") {
  //       const updatedSeat = data.payload;

  //       // --- Notification Logic ---
  //       if (updatedSeat.status === "held") {
  //         toast.info(`Seat ${updatedSeat.seatNumber} was just held!`);
  //       } else if (updatedSeat.status === "sold") {
  //         toast.success(`Seat ${updatedSeat.seatNumber} was just sold!`);
  //       } else if (updatedSeat.status === "available") {
  //         // This happens when a hold expires or is released
  //         toast.warn(`Seat ${updatedSeat.seatNumber} is now available again!`);
  //       }
  //       // --- End of Notification Logic ---

  //       setTrip((currentTrip) => ({
  //         ...currentTrip,
  //         Seats: currentTrip.Seats.map((seat) =>
  //           seat.id === updatedSeat.id ? updatedSeat : seat
  //         ),
  //       }));
  //     }
  //   };
  //   return () => socket.close();
  // }, []); // This dependency array should be empty

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
        api.post("/api/seats/release", {
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

  // NEW: Function to handle going back and releasing seats
  const handleGoBackAndRelease = async () => {
    if (heldSeats.length > 0) {
      console.log("Releasing held seats before going back...");
      const releasePromises = heldSeats.map((seat) =>
        api.post("/api/seats/release", {
          seatId: seat.id,
        })
      );

      try {
        await Promise.all(releasePromises);
      } catch (error) {
        console.error("An error occurred while releasing seats:", error);
      }
    }

    // Clean up local state and storage
    setHeldSeats([]);
    setTimeLeft(0);
    sessionStorage.removeItem("heldSeats");
    sessionStorage.removeItem("holdExpiry");

    // Navigate back to the home page
    navigate("/");
  };

  const handleSeatClick = async (seat) => {
    const isAlreadyHeld = heldSeats.some((s) => s.id === seat.id);

    if (isAlreadyHeld) {
      // --- DESELECT SEAT ---
      try {
        await api.post('/api/seats/release', {
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
          await api.post('/api/seats/hold', {
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
    // Add 'trip' to the state object
    navigate('/checkout', { state: { heldSeats, timeLeft, trip } });
    // navigate("/checkout", { state: { heldSeats, timeLeft } });
  };

  if (!trip) return <div>Loading Seat Map...</div>;

  // Add this line inside SeatMap.jsx, before the return statement
  const totalPrice = heldSeats.reduce((total, seat) => total + seat.price, 0);
  const formatTime = (seconds) =>
    `${Math.floor(seconds / 60)}:${("0" + (seconds % 60)).slice(-2)}`;

  // return (
  //   <div className="seat-map-container">
  //     <h2>{trip.routeName}</h2>
  //     <div className="seat-map">
  //       {trip.Seats.map((seat) => {
  //         const isHeldByCurrentUser = heldSeats.some((s) => s.id === seat.id);
  //         return (
  //           <Seat
  //             key={seat.id}
  //             seatInfo={seat}
  //             isHeldByCurrentUser={isHeldByCurrentUser}
  //             onClick={handleSeatClick}
  //           />
  //         );
  //       })}
  //     </div>

  //     {heldSeats.length > 0 && (
  //       <div className="proceed-container">
  //         <p>
  //           {heldSeats.length} seats selected | Total: ₹{totalPrice.toFixed(2)}
  //         </p>
  //         <p>Time left to book: {formatTime(timeLeft)}</p>
  //         <button onClick={handleProceedToCheckout} className="proceed-button">
  //           Proceed to Checkout
  //         </button>
  //       </div>
  //     )}
  //   </div>
  // );

  return (
    <div className="seat-map-container">
      {/* NEW: Add the back button here */}
        <div className="navigation-header">
            <button onClick={handleGoBackAndRelease} className="back-button">
                &larr; Back to Trips
            </button>
        </div>
      {/* NEW: Use source and destination for the heading */}
      {/* <h2>
        {trip.source} to {trip.destination}
      </h2> */}
      <div className="trip-details-header">
        <div className="route-info">
          <h2>{trip.source} &rarr; {trip.destination}</h2>
          <p>{trip.busName}</p>
        </div>
        <div className="time-info">
          <p><strong>Depart:</strong> {new Date(trip.departureTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
          <p><strong>Arrive:</strong> {new Date(trip.arrivalTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p>
        </div>
      </div>
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
