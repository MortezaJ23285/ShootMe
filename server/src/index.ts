import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { Room } from './rooms/Room.js';
import { serveStatic } from './staticFiles.js';

const PORT = Number(process.env.PORT) || 8080;
const CLIENT_DIST_PATH = process.env.CLIENT_DIST_PATH;

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }
  if (CLIENT_DIST_PATH && serveStatic(CLIENT_DIST_PATH, req, res)) return;
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server: httpServer });
const room = new Room();

wss.on('connection', (ws) => {
  const id = randomUUID();
  room.handleConnection(ws, id);
});

httpServer.listen(PORT, () => {
  console.log(`[shootme-server] listening on :${PORT}`);
});
