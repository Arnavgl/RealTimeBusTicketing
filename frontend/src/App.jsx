// File: frontend/src/App.jsx
import { Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import HomePage from './pages/HomePage';
import CheckoutPage from './pages/CheckoutPage';
import SeatMapPage from './pages/SeatMapPage'; // <-- NEW: Import the new page

import './App.css';

function App() {
  return (
    <div className="app-container">
      <h1>Bus Ticket Booking</h1>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        {/* NEW: Add the dynamic route for a specific trip */}
        <Route path="/trip/:tripId" element={<SeatMapPage />} />
      </Routes>
    </div>
  );
}

export default App;