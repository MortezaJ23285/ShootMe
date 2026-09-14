import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { MAPS, type MapId } from '@shootme/shared';
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

// One Room per map, created lazily on first join — only players who picked the
// same map end up in the same match. The map choice only arrives inside the
// client's first `join` message (no URL-param routing today), so each new
// connection waits for that one message before it's handed off to its Room.
const rooms = new Map<MapId, Room>();
function getRoom(mapId: MapId): Room {
  let room = rooms.get(mapId);
  if (!room) {
    room = new Room(mapId);
    rooms.set(mapId, room);
  }
  return room;
}

wss.on('connection', (ws) => {
  const id = randomUUID();

  ws.once('message', (raw: Buffer) => {
    let msg: unknown;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      ws.close();
      return;
    }
    if (
      !msg ||
      typeof msg !== 'object' ||
      (msg as { t?: unknown }).t !== 'join' ||
      typeof (msg as { mapId?: unknown }).mapId !== 'string' ||
      !((msg as { mapId: string }).mapId in MAPS)
    ) {
      ws.close();
      return;
    }
    const { mapId, name } = msg as { mapId: MapId; name?: string };
    getRoom(mapId).handleConnection(ws, id, name ?? '');
  });
});

httpServer.listen(PORT, () => {
  console.log(`[shootme-server] listening on :${PORT}`);
});
