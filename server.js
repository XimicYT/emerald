const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.static('public'));

const players = {};

io.on('connection', (socket) => {
  players[socket.id] = { id: socket.id, x: 0, y: 0, mapGroup: 0, mapNum: 0 };

  // Send all active players to the newly connected user
  socket.emit('currentPlayers', players);

  // Notify everyone else about the new user
  socket.broadcast.emit('playerJoined', players[socket.id]);

  socket.on('updatePosition', (data) => {
    if (players[socket.id]) {
      players[socket.id] = { ...players[socket.id], ...data, id: socket.id };
      socket.broadcast.emit('playerMoved', players[socket.id]);
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Netplay server active on port ${PORT}`);
});
