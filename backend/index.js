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
// This must be the LAST set of routes handled by Express
const path = require("path");

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

// NEW: API Endpoint to get a list of all trips
app.get("/api/trips", async (req, res) => {
  try {
    // We only fetch basic info, not all the seats, to keep it fast.
    // const trips = await Trip.findAll({
    //   attributes: ["id", "routeName", "departureTime", "arrivalTime"],
    // });
    const trips = await Trip.findAll({
      attributes: [
        "id",
        "busName",
        "source",
        "destination",
        "departureTime",
        "arrivalTime",
      ],
    });
    res.json(trips);
  } catch (error) {
    console.error("Failed to fetch trips list:", error);
    res.status(500).json({ error: "Failed to fetch trips list" });
  }
});

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

    // sendPurchaseConfirmation(email, {
    //   // Hardcode a test email for now
    //   seatNumbers: purchasedSeatsInfo.map((s) => s.seatNumber),
    //   totalPrice: purchasedSeatsInfo.reduce(
    //     (total, seat) => total + seat.price,
    //     0
    //   ),
    //   routeName: tripInfo.routeName,
    // });

    sendPurchaseConfirmation(email, {
      seatNumbers: purchasedSeatsInfo.map((s) => s.seatNumber),
      totalPrice: purchasedSeatsInfo.reduce(
        (total, seat) => total + seat.price,
        0
      ),
      trip: tripInfo, // CHANGED: Pass the whole tripInfo object
    });
  } catch (error) {
    res.status(500).json({ message: "Purchase failed.", error: error.message });
  }
});

// --- FINALIZED: SERVE FRONTEND ---
if (process.env.NODE_ENV === "production") {
  // Serve static files from the 'public' folder
  app.use(express.static(path.join(__dirname, "public")));

  // For any other GET request, send back the React's index.html file.
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
  });
}

// --- Server Setup ---
const PORT = process.env.PORT || 3001;
// In backend/index.js, replace your entire setupServer function with this
async function setupServer() {
  try {
    await sequelize.sync({ force: true });
    console.log("✅ PostgreSQL Database synchronized!");

    // await redisClient.flushall();
    // console.log('✅ Redis Database flushed!');

    // --- Trip 1: Gurugram to Jaipur ---
    const trip1 = await Trip.create({
      busName: "Volvo Sleeper A/C",
      source: "Gurugram",
      destination: "Jaipur",
      departureTime: new Date("2025-09-20T21:00:00"),
      arrivalTime: new Date("2025-09-21T05:00:00"),
    });
    for (let i = 1; i <= 40; i++) {
      await Seat.create({ seatNumber: `A${i}`, price: 650, tripId: trip1.id });
    }

    // --- Trip 2: Delhi to Manali ---
    const trip2 = await Trip.create({
      busName: "Himalayan Express",
      source: "Delhi",
      destination: "Manali",
      departureTime: new Date("2025-09-22T19:30:00"),
      arrivalTime: new Date("2025-09-23T08:00:00"),
    });
    for (let i = 1; i <= 36; i++) {
      await Seat.create({ seatNumber: `S${i}`, price: 1250, tripId: trip2.id });
    }

    // --- Trip 3: Mumbai to Goa ---
    const trip3 = await Trip.create({
      busName: "Coastal Rider",
      source: "Mumbai",
      destination: "Goa",
      departureTime: new Date("2025-09-25T22:00:00"),
      arrivalTime: new Date("2025-09-26T07:30:00"),
    });
    for (let i = 1; i <= 42; i++) {
      await Seat.create({ seatNumber: `C${i}`, price: 950, tripId: trip3.id });
    }

    console.log("🌱 Dummy trips and seats have been added.");

    server.listen(PORT, () => {
      console.log(`🚀 Server is listening on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ An error occurred during server setup:", error);
  }
}

setupServer();
