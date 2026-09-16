const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocketServer({ port: PORT });
const clients = new Map();

wss.on('connection', (ws) => {
  let playerId = null;

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw);

      if (data.type === 'JOIN') {
        playerId = data.id;
        const newPlayer = { id: playerId, username: data.username, x: 0, y: 0, map: 0 };
        clients.set(playerId, { ws, ...newPlayer });

        // Send active player list to the newly connected client
        sendPlayerList(ws);

        // Notify all other clients of the new player
        broadcastExcept(playerId, {
          type: 'PLAYER_JOIN',
          player: newPlayer
        });
      }

      if (data.type === 'MOVE') {
        const player = clients.get(playerId);
        if (player) {
          player.x = data.x;
          player.y = data.y;
          player.map = data.map;
          
          broadcastExcept(playerId, {
            type: 'MOVE',
            id: playerId,
            x: data.x,
            y: data.y,
            map: data.map
          });
        }
      }
    } catch (e) {
      console.error('Invalid message:', e);
    }
  });

  ws.on('close', () => {
    if (playerId) {
      clients.delete(playerId);
      broadcastExcept(playerId, { type: 'PLAYER_LEAVE', id: playerId });
    }
  });
});

function sendPlayerList(ws) {
  const playerList = Array.from(clients.values()).map(p => ({
    id: p.id,
    username: p.username,
    x: p.x,
    y: p.y,
    map: p.map
  }));

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'PLAYER_LIST', players: playerList }));
  }
}

function broadcastExcept(senderId, data) {
  const payload = JSON.stringify(data);
  for (const [id, client] of clients.entries()) {
    if (id !== senderId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  }
}

console.log(`Multiplayer server live on port ${PORT}`);
