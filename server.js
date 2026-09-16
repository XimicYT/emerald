const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });
const clients = new Map();

function heartbeat() {
  this.isAlive = true;
}

wss.on('connection', (ws) => {
  let playerId = null;
  ws.isAlive = true;

  ws.on('pong', heartbeat);

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);

      if (data.type === 'JOIN') {
        if (typeof data.id !== 'string' || data.id.length > 32) return;

        playerId = data.id;
        const sanitizedUsername = String(data.username || 'Trainer').slice(0, 16);
        const newPlayer = { 
          id: playerId, 
          username: sanitizedUsername, 
          x: Number(data.x) || 0, 
          y: Number(data.y) || 0, 
          map: Number(data.map) || 0 
        };
        
        clients.set(playerId, { ws, ...newPlayer });

        // Exclude joining player from their own initial list
        sendPlayerList(ws, playerId);
        
        // Notify other clients
        broadcastExcept(playerId, {
          type: 'PLAYER_JOIN',
          player: newPlayer
        });
      }

      if (data.type === 'MOVE') {
        const player = clients.get(playerId);
        if (player && typeof data.x === 'number' && typeof data.y === 'number') {
          player.x = data.x;
          player.y = data.y;
          player.map = Number(data.map) || 0;

          broadcastExcept(playerId, {
            type: 'MOVE',
            id: playerId,
            x: player.x,
            y: player.y,
            map: player.map
          });
        }
      }
    } catch (e) {
      console.error('Invalid payload format:', e);
    }
  });

  ws.on('close', () => {
    if (playerId) {
      clients.delete(playerId);
      broadcastExcept(playerId, { type: 'PLAYER_LEAVE', id: playerId });
    }
  });
});

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(interval));

function sendPlayerList(ws, excludeId) {
  const playerList = Array.from(clients.values())
    .filter(p => p.id !== excludeId) // Exclude local player
    .map(p => ({
      id: p.id,
      username: p.username,
      x: p.x,
      y: p.y,
      map: p.map
    }));

  safeSend(ws, { type: 'PLAYER_LIST', players: playerList });
}

function broadcastExcept(senderId, data) {
  for (const [id, client] of clients.entries()) {
    if (id !== senderId) {
      safeSend(client.ws, data);
    }
  }
}

function safeSend(ws, data) {
  if (ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
    } catch (e) {
      console.error('Send error:', e);
    }
  }
}

console.log(`Multiplayer server live on port ${PORT}`);
