require("dotenv").config();
// File: backend/index.js

const express = require("express");
const http = require("http"); // NEW: Import http
const WebSocket = require("ws"); // NEW: Import ws
const { Redis } = require("@upstash/redis");
const sequelize = require("./db");
const Trip = require("./models/Trip");
const Seat = require("./models/Seat");
const cors = require("cors");
const { sendPurchaseConfirmation } = require("./emailService");

// --- Redis Connection ---
const redisClient = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});
// redisClient.on("error", (err) => console.log("Redis Client Error", err));/

// --- Sequelize Relationships ---
Trip.hasMany(Seat, { foreignKey: "tripId" });
Seat.belongsTo(Trip, { foreignKey: "tripId" });

const app = express();
app.use(cors()); // NEW: Use the cors middleware
const server = http.createServer(app); // NEW: Create an http server from the express app
const wss = new WebSocket.Server({ server }); // NEW: Create a WebSocket server

// --- WebSocket Logic ---
// NEW: Function to broadcast a message to all connected clients
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

wss.on("connection", (ws) => {
  console.log("Client connected to WebSocket");
  ws.on("close", () => console.log("Client disconnected"));
});

// --- Middleware ---
app.use(express.json());

// --- API Endpoints ---
app.get("/api/trips/:tripId", async (req, res) => {
  try {
    const tripId = req.params.tripId;
    const trip = await Trip.findByPk(tripId, {
      include: [Seat],
      order: [
        [Seat, "id", "ASC"], // Sort by the Seat model's 'id' column, Ascending
      ],
    });
    if (trip) res.json(trip);
    else res.status(404).json({ error: "Trip not found" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch trip data" });
  }
});

app.post("/api/seats/hold", async (req, res) => {
  const { seatId } = req.body;
  const userId = "user123";
  const holdKey = `seat:${seatId}:hold`;
  const HOLD_DURATION_SECONDS = 20;

  try {
    const seat = await Seat.findByPk(seatId);
    if (!seat || seat.status !== "available") {
      return res
        .status(409)
        .json({ message: "Seat is not available for hold." });
    }
    const result = await redisClient.set(holdKey, userId, {
      EX: HOLD_DURATION_SECONDS,
      NX: true,
    });
    if (result) {
      seat.status = "held";
      await seat.save();
      // NEW: Broadcast the update
      broadcast({ type: "SEAT_UPDATE", payload: seat });
      res.status(200).json({ message: "Seat held successfully.", seat });
    } else {
      res
        .status(409)
        .json({ message: "Seat is already held by another user." });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
});

// NEW: API Endpoint to release a held seat
app.post("/api/seats/release", async (req, res) => {
  const { seatId } = req.body;
  const userId = "user123";
  const holdKey = `seat:${seatId}:hold`;

  try {
    const heldBy = await redisClient.get(holdKey);
    // Make sure the user releasing the seat is the one who holds it
    if (heldBy !== userId) {
      return res
        .status(403)
        .json({ message: "You do not have a hold on this seat." });
    }

    // Release the seat
    await redisClient.del(holdKey);
    const seat = await Seat.findByPk(seatId);
    if (seat) {
      seat.status = "available";
      await seat.save();
      broadcast({ type: "SEAT_UPDATE", payload: seat }); // Broadcast the release
      res.status(200).json({ message: "Seat released successfully." });
    } else {
      res.status(404).json({ message: "Seat not found." });
    }
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
});

// UPDATED: API Endpoint to purchase multiple seats
app.post("/api/seats/purchase", async (req, res) => {
  const { seatIds, email } = req.body; // <-- Add email here
  const userId = "user123";

  if (!seatIds || seatIds.length === 0) {
    return res.status(400).json({ message: "No seats selected for purchase." });
  }

  try {
    // Use a transaction to ensure all seats are purchased or none are
    await sequelize.transaction(async (t) => {
      for (const seatId of seatIds) {
        const holdKey = `seat:${seatId}:hold`;
        const heldBy = await redisClient.get(holdKey);

        if (heldBy !== userId) {
          // If any seat is not held by the user, fail the entire transaction
          throw new Error(`You do not have a valid hold on seat ${seatId}.`);
        }

        const seat = await Seat.findByPk(seatId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });
        if (seat.status !== "held") {
          throw new Error(`Seat ${seatId} is not in a held state.`);
        }

        seat.status = "sold";
        await seat.save({ transaction: t });

        // After it's saved in the DB, delete from Redis and broadcast
        await redisClient.del(holdKey);
        broadcast({ type: "SEAT_UPDATE", payload: seat });
      }
    });

    res.status(200).json({ message: "Purchase successful!" });

    // NEW: Send the confirmation email after sending the response
    const purchasedSeatsInfo = await Seat.findAll({ where: { id: seatIds } });
    const tripInfo = await Trip.findByPk(purchasedSeatsInfo[0].tripId);

    sendPurchaseConfirmation(email, {
      // Hardcode a test email for now
      seatNumbers: purchasedSeatsInfo.map((s) => s.seatNumber),
      totalPrice: purchasedSeatsInfo.reduce(
        (total, seat) => total + seat.price,
        0
      ),
      routeName: tripInfo.routeName,
    });
  } catch (error) {
    res.status(500).json({ message: "Purchase failed.", error: error.message });
  }
});

// --- Server Setup ---
const PORT = 3001;
async function setupServer() {
  try {
    await sequelize.sync({ force: true });
    console.log("✅ Database synchronized!");
    const trip1 = await Trip.create({
      routeName: "Gurugram to Jaipur",
      departureTime: new Date("2025-09-12T08:00:00"),
      arrivalTime: new Date("2025-09-12T13:00:00"),
    });
    for (let i = 1; i <= 40; i++) {
      await Seat.create({
        seatNumber: `A${i}`,
        status: "available",
        price: 650,
        tripId: trip1.id,
      });
    }
    console.log("🌱 Dummy trip and 40 seats have been added.");

    // NEW: Use server.listen instead of app.listen
    server.listen(PORT, () => {
      console.log(`🚀 Server is listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ An error occurred during server setup:", error);
  }
}

setupServer();
