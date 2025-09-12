# 🚌 Real-Time Bus Ticketing Platform

A full-stack, real-time bus ticketing application built with modern web technologies. Users can browse available trips, view seat maps in real-time, hold seats, and complete purchases with automatic email confirmations.

![Tech Stack](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

## ✨ Features

- **Real-Time Seat Updates** - Live seat status using WebSocket connections
- **Seat Holding Mechanism** - Reserve seats temporarily with Redis TTL
- **Transaction-safe Bookings** - PostgreSQL transactions prevent double-booking
- **Dynamic Seat Maps** - Interactive seat layout for each bus trip
- **Email Confirmation** - Automated PDF tickets sent after purchase
- **Responsive Design** - Works seamlessly on desktop and mobile devices

## 🏗️ Architecture

```
Frontend (React + Vite)
    │
    └── Backend (Node.js + Express)
         │
         ├── WebSocket Server (Real-time updates)
         │
         ├── PostgreSQL (Primary database - Supabase)
         │
         └── Redis (Seat locking - Upstash)
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Redis instance

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Arnavgl/RealTimeBusTicketing.git
   cd RealTimeBusTicketing
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Create .env file from example
   cp .env.example .env
   # Edit with your database credentials
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1 - Start backend
   cd backend && node index.js
   
   # Terminal 2 - Start frontend  
   cd frontend && npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## 📁 Project Structure

```
RealTimeBusTicketing/
├── Dockerfile              # Bundles the frontend and backend for deployment
├── README.md               # You are here!
├── backend/
│   ├── .env.example        # Template for environment variables
│   ├── .gitignore          # Specifies files for Git to ignore (like .env)
│   ├── db.js               # Sequelize database connection setup
│   ├── emailService.js     # Nodemailer and PDF generation logic
│   ├── index.js            # Main server file: Express, WebSockets, all API routes
│   ├── models/
│   │   ├── Seat.js         # Seat database model
│   │   └── Trip.js         # Trip database model
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/     # Reusable React components
    │   │   ├── Seat.jsx
    │   │   ├── SeatMap.jsx
    │   │   └── TripCard.jsx
    │   ├── pages/          # Page components for routing
    │   │   ├── CheckoutPage.jsx
    │   │   ├── HomePage.jsx
    │   │   └── SeatMapPage.jsx
    │   ├── App.jsx         # Main app component with routing setup
    │   └── main.jsx        # Entry point for the React application
    └── package.json
```

## 🔧 Configuration

Environment variables needed for backend:

```env
DATABASE_URL="YOUR_SUPABASE_POSTGRES_CONNECTION_STRING"
UPSTASH_REDIS_URL="YOUR_UPSTASH_REDIS_URL"
UPSTASH_REDIS_TOKEN="YOUR_UPSTASH_REDIS_TOKEN"
EMAIL_USER="YOUR_GMAIL_ADDRESS_FOR_NODEMAILER"
EMAIL_PASS="YOUR_16_CHARACTER_GMAIL_APP_PASSWORD"
```

## 🎯 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trips` | Get all available trips |
| GET | `/api/trips/:tripId` | Get seat map for a trip |
| POST | `/api/seats/hold` | Temporarily hold seats (with a TTL in Redis) |
| POST | `/api/seats/release` | Release held seats when time expires |
| POST | `/api/seats/purchase` | Confirms all held seats in one transaction |

## 📞 Support

For questions or support, please open an issue on GitHub or contact at goyalagf@gmail.com.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
