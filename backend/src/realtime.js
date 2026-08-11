import jwt from "jsonwebtoken";
import { WebSocket, WebSocketServer } from "ws";
import User from "./models/User.js";

const HEARTBEAT_INTERVAL_MS = 25000;
const clientsByUserId = new Map();
const clientsByRoom = new Map();
let wss = null;

function safeSend(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({ ...payload, timestamp: payload.timestamp || new Date().toISOString() }));
}

function addClient(userId, socket) {
  const key = String(userId);
  if (!clientsByUserId.has(key)) {
    clientsByUserId.set(key, new Set());
  }
  clientsByUserId.get(key).add(socket);
  socket.userRooms = socket.userRooms || new Set();

  socket.on("close", () => {
    // Remove from user sockets
    const sockets = clientsByUserId.get(key);
    if (sockets) {
      sockets.delete(socket);
      if (sockets.size === 0) clientsByUserId.delete(key);
    }

    // Remove from all rooms
    if (socket.userRooms) {
      for (const roomName of socket.userRooms) {
        const roomSet = clientsByRoom.get(roomName);
        if (roomSet) {
          roomSet.delete(socket);
          if (roomSet.size === 0) clientsByRoom.delete(roomName);
        }
      }
    }
  });
}

function joinRoom(socket, roomName) {
  if (!roomName || !socket) return;
  socket.userRooms = socket.userRooms || new Set();
  socket.userRooms.add(roomName);

  if (!clientsByRoom.has(roomName)) {
    clientsByRoom.set(roomName, new Set());
  }
  clientsByRoom.get(roomName).add(socket);
}

function leaveRoom(socket, roomName) {
  if (!roomName || !socket || !socket.userRooms) return;
  socket.userRooms.delete(roomName);

  const roomSet = clientsByRoom.get(roomName);
  if (roomSet) {
    roomSet.delete(socket);
    if (roomSet.size === 0) clientsByRoom.delete(roomName);
  }
}

async function authenticateSocket(request) {
  const url = new URL(request.url, "http://localhost");
  const token = url.searchParams.get("token");
  if (!token || !process.env.JWT_SECRET) return null;

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const userId = payload.sub || payload.id || payload._id;
    if (!userId) return null;

    const user = await User.findById(userId).select("_id name email role status");
    if (!user || user.status === "deactivated") return null;
    return user;
  } catch (err) {
    console.error("[WebSocket Auth Error]:", err.message);
    return null;
  }
}

export function setupRealtime(server) {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (request, socket, head) => {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname !== "/ws" && url.pathname !== "/") return;

    try {
      const user = await authenticateSocket(request);
      if (!user) {
        socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
        socket.end();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        ws.user = user;
        ws.isAlive = true;
        ws.userRooms = new Set();
        
        addClient(user._id, ws);

        // Auto-join role room
        if (user.role) {
          joinRoom(ws, `role:${user.role}`);
        }

        ws.on("pong", () => {
          ws.isAlive = true;
        });

        ws.on("message", (raw) => {
          try {
            const data = JSON.parse(raw.toString());
            if (data.type === "join_room" && data.room) {
              joinRoom(ws, data.room);
              safeSend(ws, { type: "room:joined", room: data.room });
            } else if (data.type === "leave_room" && data.room) {
              leaveRoom(ws, data.room);
              safeSend(ws, { type: "room:left", room: data.room });
            } else if (data.type === "ping") {
              safeSend(ws, { type: "pong" });
            }
          } catch {
            // Ignore invalid JSON frame
          }
        });

        safeSend(ws, {
          type: "connection:ready",
          user: { id: String(user._id), role: user.role, name: user.name, email: user.email },
          timestamp: new Date().toISOString(),
        });
      });
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.end();
    }
  });

  const heartbeat = setInterval(() => {
    if (!wss) return;
    wss.clients.forEach((socket) => {
      if (!socket.isAlive) {
        socket.terminate();
        return;
      }
      socket.isAlive = false;
      socket.ping();
    });
  }, HEARTBEAT_INTERVAL_MS);

  wss.on("close", () => clearInterval(heartbeat));
  console.log("[WebSocket] Realtime server listening on /ws");
  return wss;
}

export function broadcastToUser(userId, payload) {
  if (!userId) return;
  const sockets = clientsByUserId.get(String(userId));
  if (!sockets) return;
  sockets.forEach((socket) => safeSend(socket, payload));
}

export function broadcastToRole(role, payload) {
  if (!role) return;
  broadcastToRoom(`role:${role}`, payload);
}

export function broadcastToRoom(roomName, payload) {
  if (!roomName) return;
  const sockets = clientsByRoom.get(roomName);
  if (!sockets) return;
  sockets.forEach((socket) => safeSend(socket, payload));
}

export function broadcastToAll(payload) {
  if (!wss) return;
  wss.clients.forEach((socket) => safeSend(socket, payload));
}

// Dedicated Domain Event Emitters

export function emitNotificationCreated(userId, notification) {
  if (!userId) return;
  broadcastToUser(userId, {
    type: "notification:created",
    notification,
  });
}

export function emitBookingCreated(booking) {
  if (!booking) return;

  const payload = {
    type: "booking:created",
    booking,
  };

  // Notify merchant and admin
  if (booking.merchant) broadcastToUser(booking.merchant, payload);
  if (booking.merchantId) broadcastToUser(booking.merchantId, payload);
  if (booking.customer) broadcastToUser(booking.customer, payload);
  broadcastToRole("admin", payload);

  // Invalidate booking caches
  emitResourceChanged({ resource: "bookings", action: "create", actorId: booking.customer });
}

export function emitBookingUpdated(booking, action = "update") {
  if (!booking) return;

  const payload = {
    type: "booking:updated",
    action,
    booking,
  };

  if (booking.customer) broadcastToUser(booking.customer, payload);
  if (booking.merchant) broadcastToUser(booking.merchant, payload);
  if (booking.merchantId) broadcastToUser(booking.merchantId, payload);
  broadcastToRole("admin", payload);
  if (booking._id) broadcastToRoom(`booking:${booking._id}`, payload);

  emitResourceChanged({ resource: "bookings", action, actorId: booking.customer });
}

export function emitMessageCreated(message) {
  if (!message) return;

  const payload = {
    type: "message:created",
    message,
  };

  // Notify merchant & customer
  if (message.merchant) broadcastToUser(message.merchant, payload);
  if (message.customerId) broadcastToUser(message.customerId, payload);
  broadcastToRole("admin", payload);

  emitResourceChanged({ resource: "contact", action: "create", actorId: message.customerId });
}

export function emitMessageReplied(message, reply) {
  if (!message) return;

  const payload = {
    type: "message:reply",
    message,
    reply,
  };

  if (message.merchant) broadcastToUser(message.merchant, payload);
  if (message.customerId) broadcastToUser(message.customerId, payload);

  emitResourceChanged({ resource: "contact", action: "reply" });
}

export function emitTicketsUpdated(eventId, eventData) {
  if (!eventId) return;

  const payload = {
    type: "event:tickets_updated",
    eventId: String(eventId),
    tickets: eventData?.tickets || [],
    sessions: eventData?.sessions || null,
  };

  broadcastToRoom(`event:${eventId}`, payload);
  broadcastToAll(payload);
  emitResourceChanged({ resource: "events", action: "tickets_updated" });
}

export function emitTicketScanned(ticket, result) {
  if (!ticket) return;

  const payload = {
    type: "ticket:scanned",
    ticket,
    result,
  };

  if (ticket.eventId) broadcastToRoom(`event:${ticket.eventId}`, payload);
  if (ticket.merchantId) broadcastToUser(ticket.merchantId, payload);

  emitResourceChanged({ resource: "bookings", action: "ticket_scanned" });
}

export function emitResourceChanged({ resource, action, actorId }) {
  broadcastToAll({
    type: "resource:changed",
    resource,
    action,
    actorId: actorId ? String(actorId) : null,
  });
}

export function emitCustomServiceRequestCreated(request) {
  if (!request) return;
  const payload = {
    type: "custom_service:created",
    request,
  };
  broadcastToRole("admin", payload);
  emitResourceChanged({ resource: "custom-service-requests", action: "create", actorId: request.user });
}

export function emitCustomServiceQuoted(userId, request) {
  if (!request) return;
  const payload = {
    type: "custom_service:quoted",
    request,
  };
  if (userId) broadcastToUser(userId, payload);
  broadcastToRole("admin", payload);
  emitResourceChanged({ resource: "custom-service-requests", action: "quoted", actorId: userId });
}

export function emitCustomServiceRejected(userId, request) {
  if (!request) return;
  const payload = {
    type: "custom_service:rejected",
    request,
  };
  if (userId) broadcastToUser(userId, payload);
  broadcastToRole("admin", payload);
  emitResourceChanged({ resource: "custom-service-requests", action: "rejected", actorId: userId });
}

export function emitCustomServicePaid(request) {
  if (!request) return;
  const payload = {
    type: "custom_service:paid",
    request,
  };
  if (request.user) broadcastToUser(request.user, payload);
  broadcastToRole("admin", payload);
  emitResourceChanged({ resource: "custom-service-requests", action: "paid", actorId: request.user });
}

export function emitWalletUpdated(userId, walletBalance) {
  if (!userId) return;
  const payload = {
    type: "wallet:updated",
    walletBalance,
  };
  broadcastToUser(userId, payload);
  emitResourceChanged({ resource: "auth", action: "wallet_updated", actorId: userId });
  emitResourceChanged({ resource: "wallet", action: "wallet_updated", actorId: userId });
}

