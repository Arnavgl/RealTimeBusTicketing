// File: frontend/src/websocket.js

const createSocketConnection = () => {
  // Vite provides this variable to know if we are in production
  const isProduction = import.meta.env.PROD;

  // Use 'wss' (secure WebSocket) on the deployed site, 'ws' locally
  const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';

  // Use the live site's hostname in production, localhost in development
  const wsHost = isProduction ? window.location.host : 'localhost:3001';

  const wsUrl = `${wsProtocol}://${wsHost}`;

  console.log(`Attempting to connect WebSocket to: ${wsUrl}`); // Helpful for debugging

  return new WebSocket(wsUrl);
};

export default createSocketConnection;