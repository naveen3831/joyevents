import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import url from "url";

let wss = null;

// Map of room name -> Set of WebSocket clients
const rooms = new Map();
// Map of userId -> Set of WebSocket clients (allows multiple tabs/devices per user)
const userSockets = new Map();

/**
 * Initialize WebSocket Server attached to HTTP server
 */
export function initWebSocketServer(server) {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const parsedUrl = url.parse(request.url, true);
    // Allow WebSocket endpoint on /ws or root
    if (parsedUrl.pathname === "/ws" || parsedUrl.pathname === "/") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", (ws, req) => {
    const parsedUrl = url.parse(req.url, true);
    const token = parsedUrl.query?.token;

    ws.isAlive = true;
    ws.user = null;
    ws.rooms = new Set();

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    // Authenticate if token provided in connection query
    if (token) {
      authenticateSocket(ws, token);
    }

    ws.on("message", (rawMessage) => {
      try {
        const data = JSON.parse(rawMessage.toString());
        handleSocketMessage(ws, data);
      } catch (err) {
        console.error("[WebSocket] Malformed message received:", err.message);
      }
    });

    ws.on("close", () => {
      cleanUpSocket(ws);
    });

    ws.on("error", (err) => {
      console.error("[WebSocket] Socket error:", err.message);
      cleanUpSocket(ws);
    });
  });

  // Heartbeat interval to ping clients every 25s
  const pingInterval = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        cleanUpSocket(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 25000);

  wss.on("close", () => {
    clearInterval(pingInterval);
  });

  console.log("[WebSocket] Server initialized successfully");
  return wss;
}

/**
 * Authenticate socket connection using JWT token
 */
function authenticateSocket(ws, token) {
  try {
    const secret = process.env.JWT_SECRET || "fallback_secret";
    const decoded = jwt.verify(token, secret);
    
    ws.user = {
      _id: decoded.id || decoded._id,
      email: decoded.email,
      role: decoded.role,
    };

    const userIdStr = String(ws.user._id);

    // Track user socket
    if (!userSockets.has(userIdStr)) {
      userSockets.set(userIdStr, new Set());
    }
    userSockets.get(userIdStr).add(ws);

    // Auto-join user personal room & role room
    joinRoom(ws, `user:${userIdStr}`);
    if (ws.user.role) {
      joinRoom(ws, `role:${ws.user.role}`);
    }

    sendToSocket(ws, "auth_success", {
      user: ws.user,
      message: "Authenticated successfully over WebSocket",
    });

  } catch (err) {
    sendToSocket(ws, "auth_error", { error: "Invalid token" });
  }
}

/**
 * Handle incoming client JSON messages
 */
function handleSocketMessage(ws, data) {
  const { type, payload, room, token } = data;

  switch (type) {
    case "auth":
      if (token) authenticateSocket(ws, token);
      break;

    case "join_room":
      if (room) joinRoom(ws, room);
      break;

    case "leave_room":
      if (room) leaveRoom(ws, room);
      break;

    case "ping":
      sendToSocket(ws, "pong", { timestamp: Date.now() });
      break;

    default:
      // Custom event handling if needed
      break;
  }
}

/**
 * Join socket to a room
 */
export function joinRoom(ws, roomName) {
  if (!roomName) return;
  ws.rooms.add(roomName);

  if (!rooms.has(roomName)) {
    rooms.set(roomName, new Set());
  }
  rooms.get(roomName).add(ws);
}

/**
 * Leave socket from a room
 */
export function leaveRoom(ws, roomName) {
  if (!roomName) return;
  ws.rooms.delete(roomName);

  if (rooms.has(roomName)) {
    const roomSet = rooms.get(roomName);
    roomSet.delete(ws);
    if (roomSet.size === 0) {
      rooms.delete(roomName);
    }
  }
}

/**
 * Cleanup socket from user and room indexes on disconnect
 */
function cleanUpSocket(ws) {
  if (ws.user?._id) {
    const userIdStr = String(ws.user._id);
    if (userSockets.has(userIdStr)) {
      const userSet = userSockets.get(userIdStr);
      userSet.delete(ws);
      if (userSet.size === 0) {
        userSockets.delete(userIdStr);
      }
    }
  }

  for (const roomName of ws.rooms) {
    leaveRoom(ws, roomName);
  }
}

/**
 * Utility to send JSON payload to a single socket
 */
export function sendToSocket(ws, type, payload = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
  }
}

/**
 * Emit event to all sockets in a room
 */
export function emitToRoom(roomName, type, payload = {}) {
  if (!roomName || !rooms.has(roomName)) return;
  const roomSet = rooms.get(roomName);
  const message = JSON.stringify({ type, payload, room: roomName, timestamp: Date.now() });

  for (const ws of roomSet) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  }
}

/**
 * Emit event directly to a specific user (all open tabs/devices)
 */
export function emitToUser(userId, type, payload = {}) {
  if (!userId) return;
  const userIdStr = String(userId);
  emitToRoom(`user:${userIdStr}`, type, payload);
}

/**
 * Emit event to all users of a specific role (e.g. "admin", "merchant")
 */
export function emitToRole(role, type, payload = {}) {
  if (!role) return;
  emitToRoom(`role:${role}`, type, payload);
}

/**
 * Broadcast event to all connected WebSocket clients
 */
export function broadcast(type, payload = {}) {
  if (!wss) return;
  const message = JSON.stringify({ type, payload, timestamp: Date.now() });

  wss.clients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}
