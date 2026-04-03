import test from 'node:test';
import assert from 'node:assert/strict';
import { SessionManager } from '../src/sessionManager.js';

test('creates a session and returns host player id', () => {
  const manager = new SessionManager(() => 1_000);
  const created = manager.createSession({ hostName: 'Host', mapName: 'small_island' });

  assert.ok(created.sessionId);
  assert.ok(created.playerId);
});

test('joins and receives remote state from other players', () => {
  let now = 1_000;
  const manager = new SessionManager(() => now);

  const host = manager.createSession({ hostName: 'Host', mapName: 'small_island' });
  const guest = manager.joinSession({ sessionId: host.sessionId, playerName: 'Guest' });

  manager.updatePlayerState({
    sessionId: host.sessionId,
    playerId: host.playerId,
    transform: {
      pos: [1, 2, 3],
      rot: [0, 0, 0, 1],
      vel: [4, 5, 6]
    }
  });

  const snapshot = manager.getRemoteStates({
    sessionId: host.sessionId,
    requestingPlayerId: guest.playerId
  });

  assert.equal(snapshot.remotes.length, 1);
  assert.equal(snapshot.remotes[0].name, 'Host');
  assert.deepEqual(snapshot.remotes[0].transform.pos, [1, 2, 3]);

  now = 50_000;
  const pruned = manager.getRemoteStates({
    sessionId: host.sessionId,
    requestingPlayerId: guest.playerId
  });

  assert.equal(pruned.remotes.length, 0);
});
