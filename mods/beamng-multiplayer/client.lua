-- BeamNG.drive Lua extension prototype for multiplayer state syncing.
-- Place inside a mod as lua/ge/extensions/multiplayer/client.lua and load from the extension manager.

local M = {}

local relayBaseUrl = "http://127.0.0.1:3010"
local sessionId = nil
local playerId = nil

local function encode(payload)
  return jsonEncode(payload)
end

local function post(path, payload)
  local body = encode(payload)
  extensions.util_httpRequest({
    url = relayBaseUrl .. path,
    method = "POST",
    headers = { ["Content-Type"] = "application/json" },
    body = body,
    callback = function() end
  })
end

local function pollRemoteState()
  if not sessionId or not playerId then
    return
  end

  extensions.util_httpRequest({
    url = string.format("%s/api/sessions/%s/state?playerId=%s", relayBaseUrl, sessionId, playerId),
    method = "GET",
    callback = function(response)
      -- TODO: spawn/update ghost vehicles based on response.remotes.
      -- For now this is a placeholder to demonstrate polling flow.
      dump(response)
    end
  })
end

local function sendLocalState()
  if not sessionId or not playerId then
    return
  end

  local veh = be:getPlayerVehicle(0)
  if not veh then
    return
  end

  local pos = veh:getPosition()
  local rot = veh:getRotation()
  local vel = veh:getVelocity()

  post(string.format("/api/sessions/%s/state", sessionId), {
    playerId = playerId,
    transform = {
      pos = { pos.x, pos.y, pos.z },
      rot = { rot.x, rot.y, rot.z, rot.w },
      vel = { vel.x, vel.y, vel.z }
    }
  })
end

local accumulator = 0

local function onUpdate(dtReal)
  accumulator = accumulator + dtReal

  if accumulator >= 0.1 then
    accumulator = 0
    sendLocalState()
    pollRemoteState()
  end
end

local function configure(newSessionId, newPlayerId)
  sessionId = newSessionId
  playerId = newPlayerId
end

M.onUpdate = onUpdate
M.configure = configure

return M
