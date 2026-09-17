const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for testing (you can lock this down later)
    methods: ["GET", "POST"]
  }
});

// Store connected players
const players = {};

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);
  
  // Initialize player data
  players[socket.id] = { x: 0, y: 0, mapId: 0 };

  // Listen for position updates from the client
  socket.on('updatePosition', (data) => {
    players[socket.id] = {
      x: data.x,
      y: data.y,
      mapId: data.mapId
    };
    
    // Broadcast all players to everyone except the sender
    socket.broadcast.emit('playerUpdates', players);
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
