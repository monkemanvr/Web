import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SessionManager } from './sessionManager.js';

const sessionManager = new SessionManager();
const PORT = Number(process.env.PORT || 3010);
const ROOT_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const PUBLIC_DIR = join(ROOT_DIR, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const server = createServer(async (req, res) => {
  try {
    if (!req.url || !req.method) {
      sendJson(res, 400, { error: 'BAD_REQUEST' });
      return;
    }

    if (req.url.startsWith('/api/')) {
      await handleApi(req, res);
      return;
    }

    await handleStatic(req, res);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: 'INTERNAL_SERVER_ERROR' });
  }
});

async function handleApi(req, res) {
  const url = new URL(req.url, 'http://localhost');

  if (req.method === 'POST' && url.pathname === '/api/sessions') {
    const body = await readJsonBody(req);
    if (!body?.hostName || !body?.mapName) {
      sendJson(res, 400, { error: 'hostName and mapName are required' });
      return;
    }

    const created = sessionManager.createSession(body);
    sendJson(res, 201, created);
    return;
  }

  const joinMatch = url.pathname.match(/^\/api\/sessions\/([a-z0-9-]+)\/join$/i);
  if (req.method === 'POST' && joinMatch) {
    const body = await readJsonBody(req);
    if (!body?.playerName) {
      sendJson(res, 400, { error: 'playerName is required' });
      return;
    }

    const joined = sessionManager.joinSession({
      sessionId: joinMatch[1],
      playerName: body.playerName
    });

    if (!joined) {
      sendJson(res, 404, { error: 'SESSION_NOT_FOUND' });
      return;
    }

    sendJson(res, 200, joined);
    return;
  }

  const stateMatch = url.pathname.match(/^\/api\/sessions\/([a-z0-9-]+)\/state$/i);
  if (req.method === 'POST' && stateMatch) {
    const body = await readJsonBody(req);
    if (!body?.playerId || !body?.transform) {
      sendJson(res, 400, { error: 'playerId and transform are required' });
      return;
    }

    const result = sessionManager.updatePlayerState({
      sessionId: stateMatch[1],
      playerId: body.playerId,
      transform: body.transform
    });

    if (!result.ok) {
      sendJson(res, 404, { error: result.reason });
      return;
    }

    sendJson(res, 204, null);
    return;
  }

  if (req.method === 'GET' && stateMatch) {
    const playerId = url.searchParams.get('playerId');
    if (!playerId) {
      sendJson(res, 400, { error: 'playerId query parameter is required' });
      return;
    }

    const snapshot = sessionManager.getRemoteStates({
      sessionId: stateMatch[1],
      requestingPlayerId: playerId
    });

    if (!snapshot) {
      sendJson(res, 404, { error: 'SESSION_NOT_FOUND' });
      return;
    }

    sendJson(res, 200, snapshot);
    return;
  }

  sendJson(res, 404, { error: 'NOT_FOUND' });
}

async function handleStatic(req, res) {
  const pathname = req.url === '/' ? '/index.html' : req.url;
  const filePath = join(PUBLIC_DIR, pathname);

  try {
    const data = await readFile(filePath);
    const contentType = MIME_TYPES[extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: 'NOT_FOUND' });
  }
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return null;
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf-8'));
}

function sendJson(res, statusCode, payload) {
  if (statusCode === 204) {
    res.writeHead(204);
    res.end();
    return;
  }

  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

server.listen(PORT, () => {
  console.log(`BeamNG multiplayer relay listening at http://localhost:${PORT}`);
});
