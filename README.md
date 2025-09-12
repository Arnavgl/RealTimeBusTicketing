# 🚌 Real-Time Bus Ticketing Platform

A full-stack, real-time bus ticketing application where users can view, hold, and purchase seats for various trips. This project demonstrates a robust backend architecture designed for concurrency and a responsive frontend for a seamless user experience.

**[➡️ Live Demo Link Here ⬅️]** *(You will replace this with your Render URL after deployment)*

---

## ✨ Key Features

-   **Real-Time Seat Status:** The seat map updates live for all connected users using **WebSockets**. See seats change from `available` to `held` to `sold` instantly without refreshing the page.
-   **Concurrent Seat Holds:** Implemented a robust seat-holding mechanism using **Redis with TTL**. This prevents double-booking and ensures users have a fair window to complete their purchase.
-   **Transactional Purchases:** The purchase flow is wrapped in a **PostgreSQL transaction** to guarantee atomicity. Either all seats in a booking are confirmed, or none are, ensuring data integrity.
-   **Dynamic Trip & Seat Map Loading:** Users can browse a list of available trips and select one to view a dynamically loaded seat map specific to that bus.
-   **Automated Post-Sale Communication:** On successful purchase, the system automatically sends a confirmation email with a dynamically generated **PDF invoice** attached, using Nodemailer.
-   **In-App Notifications:** Real-time toast notifications alert users to key events, such as when a seat is held or becomes available again.
-   **State Persistence:** The frontend uses `sessionStorage` to persist a user's selections across page navigations, providing a smooth checkout experience.

---

## 🛠️ Tech Stack & Architecture

This project is built with a modern, scalable tech stack, focusing on real-time capabilities and a clean separation of concerns.

| Category              | Technology                                                                                                                                                                                                                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Frontend** | ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![Vite](https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E)                                     |
| **Backend** | ![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white) ![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)                 |
| **Database** | ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white) (managed via **Supabase**)                                                                                             |
| **In-Memory Store** | ![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white) (managed via **Upstash**)                                                                                                               |
| **Real-Time** | ![WebSocket](https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=websocket&logoColor=white)                                                                                                                           |
| **Deployment** | ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white) on ![Render](https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white)                             |

---

## 🚀 Getting Started

To run this project locally, follow these steps:

### Prerequisites

-   Node.js (v20.x or higher)
-   Access to a Supabase (PostgreSQL) and an Upstash (Redis) instance.

### 1. Clone the Repository
```bash
git clone [https://github.com/YourUsername/real-time-bus-ticketing.git](https://github.com/YourUsername/real-time-bus-ticketing.git)
cd real-time-bus-ticketing
2. Backend Setup
Bash

cd backend
npm install
Create a .env file in the backend directory.

Copy the contents of .env.example into your new .env file.

Fill in your actual credentials for Supabase, Upstash, and your Gmail App Password for Nodemailer.

Bash

# Start the backend server
node index.js
The backend will be running at http://localhost:3001.

3. Frontend Setup
Open a new terminal window.

Bash

cd frontend
npm install
# Start the frontend development server
npm run dev
The frontend will be running at http://localhost:5173.

📝 Note on the "Organizer" Role
As per the assignment, an "Organizer" can create trips. In this initial version of the project, this functionality is handled by a seeding script within the backend (backend/index.js). When the server starts in a development environment, it automatically populates the database with several pre-defined trips and their corresponding seat layouts. This provides a robust set of data for demonstrating the core passenger-facing features. A dedicated UI for organizers would be a key feature for a V2 of this application.


---