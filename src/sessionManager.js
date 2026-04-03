import { randomUUID } from 'node:crypto';

const SESSION_TTL_MS = 30_000;

export class SessionManager {
  constructor(now = () => Date.now()) {
    this.now = now;
    this.sessions = new Map();
  }

  createSession({ hostName, mapName }) {
    const sessionId = randomUUID();
    const hostId = randomUUID();

    const session = {
      id: sessionId,
      mapName,
      createdAt: this.now(),
      updatedAt: this.now(),
      players: new Map([
        [
          hostId,
          {
            id: hostId,
            name: hostName,
            lastSeenAt: this.now(),
            transform: null
          }
        ]
      ])
    };

    this.sessions.set(sessionId, session);

    return {
      sessionId,
      playerId: hostId
    };
  }

  joinSession({ sessionId, playerName }) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const playerId = randomUUID();
    session.players.set(playerId, {
      id: playerId,
      name: playerName,
      lastSeenAt: this.now(),
      transform: null
    });
    session.updatedAt = this.now();

    return { sessionId, playerId };
  }

  updatePlayerState({ sessionId, playerId, transform }) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return { ok: false, reason: 'SESSION_NOT_FOUND' };
    }

    const player = session.players.get(playerId);
    if (!player) {
      return { ok: false, reason: 'PLAYER_NOT_FOUND' };
    }

    player.transform = {
      pos: transform.pos,
      rot: transform.rot,
      vel: transform.vel,
      updatedAt: this.now()
    };
    player.lastSeenAt = this.now();
    session.updatedAt = this.now();

    return { ok: true };
  }

  getRemoteStates({ sessionId, requestingPlayerId }) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    this.pruneInactivePlayers(session);

    const remotes = [];
    for (const player of session.players.values()) {
      if (player.id === requestingPlayerId || !player.transform) {
        continue;
      }

      remotes.push({
        playerId: player.id,
        name: player.name,
        transform: player.transform
      });
    }

    return {
      sessionId,
      mapName: session.mapName,
      serverTime: this.now(),
      remotes
    };
  }

  pruneInactivePlayers(session) {
    const cutoff = this.now() - SESSION_TTL_MS;

    for (const [playerId, player] of session.players.entries()) {
      if (player.lastSeenAt < cutoff) {
        session.players.delete(playerId);
      }
    }

    if (session.players.size === 0) {
      this.sessions.delete(session.id);
    }
  }
}
