# BeamNG.drive Multiplayer Prototype App

This repository contains a prototype app that adds basic multiplayer synchronization flow to BeamNG.drive:

- A Node.js relay server with session creation/join APIs.
- State update + polling endpoints for vehicle transforms.
- A BeamNG Lua extension sample (`mods/beamng-multiplayer/client.lua`) to push local state and read remote state.

## Why this is a prototype

BeamNG does not expose first-party turn-key multiplayer in vanilla single-player mode, so this app implements a lightweight relay architecture you can expand with:

- Ghost vehicle spawning and interpolation.
- Collision/network reconciliation.
- Authentication and matchmaking.
- NAT traversal / dedicated hosting.

## Run from source

```bash
npm install
npm start
```

Server default URL: `http://localhost:3010`

## Build a Windows `.exe` locally

```bash
npm install
npm run build:win
```

Output binary:

- `dist/beamng-multiplayer-relay.exe`

## Downloadable `.exe` from GitHub

This repo now includes a GitHub Actions workflow at `.github/workflows/build-windows-exe.yml` that:

1. Runs tests.
2. Builds `dist/beamng-multiplayer-relay.exe`.
3. Uploads it as an Actions artifact.
4. Attaches it to GitHub Releases when you push a tag like `v0.2.0`.

### Steps to publish download link

1. Push this repo to GitHub.
2. Create and push a version tag:
   ```bash
   git tag v0.2.0
   git push origin v0.2.0
   ```
3. Open GitHub → **Releases** and download `beamng-multiplayer-relay.exe`.

## API summary

### Create session

```bash
curl -X POST http://localhost:3010/api/sessions \
  -H 'Content-Type: application/json' \
  -d '{"hostName":"Host","mapName":"west_coast_usa"}'
```

### Join session

```bash
curl -X POST http://localhost:3010/api/sessions/<session-id>/join \
  -H 'Content-Type: application/json' \
  -d '{"playerName":"Guest"}'
```

### Send player state

```bash
curl -X POST http://localhost:3010/api/sessions/<session-id>/state \
  -H 'Content-Type: application/json' \
  -d '{"playerId":"<player-id>","transform":{"pos":[0,0,0],"rot":[0,0,0,1],"vel":[0,0,0]}}'
```

### Read remote players

```bash
curl "http://localhost:3010/api/sessions/<session-id>/state?playerId=<player-id>"
```

## BeamNG integration notes

1. Put `mods/beamng-multiplayer/client.lua` into a BeamNG mod under `lua/ge/extensions/multiplayer/client.lua`.
2. Load the extension in-game.
3. Call `extensions.multiplayer_client.configure(sessionId, playerId)` after creating/joining via external UI.

The included Lua script is intentionally minimal and focuses on transport, not full entity replication.
