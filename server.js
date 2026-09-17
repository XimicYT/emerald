const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const players = {};

io.on('connection', (socket) => {
  console.log(`[CONNECT] Player joined: ${socket.id}`);

  socket.on('updatePosition', (data) => {
    players[socket.id] = {
      x: data.x,
      y: data.y,
      mapId: data.mapId,
      lastSeen: Date.now()
    };
    
    // Send updated player state to ALL connected clients
    io.emit('playerUpdates', players);
  });

  socket.on('disconnect', () => {
    console.log(`[DISCONNECT] Player left: ${socket.id}`);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
