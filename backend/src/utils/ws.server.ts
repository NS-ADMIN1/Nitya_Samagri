import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { redis } from "../config/redis";
import { logger } from "../utils/logger";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuthenticatedSocket extends WebSocket {
  userId?:        string;
  userRole?:      string;
  isAlive:        boolean;
  isAuthenticated: boolean;
}

export type WsEventType =
  | "ORDER_STATUS_UPDATE"
  | "ORDER_CONFIRMED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "BOOKING_CONFIRMED"
  | "BOOKING_CANCELLED"
  | "LOW_STOCK_ALERT"
  | "NEW_ORDER_ALERT";

export interface WsMessage {
  event:   WsEventType;
  payload: Record<string, unknown>;
}

// ── Connection registry ───────────────────────────────────────────────────────
// Map of userId → Set of WebSocket connections (a user may have multiple tabs)
const userConnections = new Map<string, Set<AuthenticatedSocket>>();
// Admin connections pool
const adminConnections = new Set<AuthenticatedSocket>();

// How long an unauthenticated connection is allowed to stay open before it
// must send an { type: "auth", token } message, or it's dropped.
const AUTH_TIMEOUT_MS = 10_000;

let wss: WebSocketServer;

// ── Cross-instance delivery (Redis pub/sub) ─────────────────────────────────
// The connection registries above (userConnections, adminConnections, wss)
// only know about sockets open on THIS process. Behind a load balancer with
// more than one backend replica, a customer connected to instance A never
// sees an event emitted from instance B unless something relays it across
// processes — so every emit is published on a shared Redis channel, and
// every instance (including the one that published it) subscribes to that
// channel and delivers to whichever local sockets match the target.
//
// Local delivery still happens synchronously and unconditionally at publish
// time, before the Redis round-trip — a Redis outage degrades this back to
// single-instance-only delivery instead of losing events on the instance
// that actually handled the request. INSTANCE_ID lets the subscriber ignore
// the echo of an instance's own publish, so that instance doesn't deliver
// the same message to its local sockets twice.
const WS_CHANNEL   = "ws:broadcast";
const INSTANCE_ID  = crypto.randomUUID();

interface WsBroadcast {
  target:  "user" | "admins" | "all";
  userId?: string; // present when target === "user"
  message: WsMessage;
  origin:  string;
}

function deliverLocally(broadcast: Omit<WsBroadcast, "origin">) {
  const payload = JSON.stringify(broadcast.message);

  if (broadcast.target === "user" && broadcast.userId) {
    const conns = userConnections.get(broadcast.userId);
    conns?.forEach(socket => {
      if (socket.readyState === WebSocket.OPEN) socket.send(payload);
    });
  } else if (broadcast.target === "admins") {
    adminConnections.forEach(socket => {
      if (socket.readyState === WebSocket.OPEN) socket.send(payload);
    });
  } else if (broadcast.target === "all") {
    wss?.clients.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) ws.send(payload);
    });
  }
}

function publish(broadcast: Omit<WsBroadcast, "origin">) {
  // Always deliver locally first — this instance's own connections must not
  // depend on Redis being reachable.
  deliverLocally(broadcast);

  redis.publish(WS_CHANNEL, JSON.stringify({ ...broadcast, origin: INSTANCE_ID })).catch((err: Error) => {
    logger.error("Failed to publish WS event to Redis — other instances won't see it:", err.message);
  });
}

// Subscribing requires a dedicated connection: once an ioredis connection
// issues SUBSCRIBE it can no longer run ordinary commands, so it can't share
// the connection used for PUBLISH/caching/etc.
const subscriber = redis.duplicate();

subscriber.on("error", (err: Error) => {
  logger.error("WS Redis subscriber error:", err.message);
});

subscriber.subscribe(WS_CHANNEL, (err) => {
  if (err) logger.error("Failed to subscribe to WS broadcast channel:", err.message);
  else      logger.info(`Subscribed to Redis channel "${WS_CHANNEL}" for cross-instance WS delivery`);
});

subscriber.on("message", (channel: string, raw: string) => {
  if (channel !== WS_CHANNEL) return;

  let broadcast: WsBroadcast;
  try {
    broadcast = JSON.parse(raw);
  } catch {
    logger.warn("Received malformed WS broadcast message from Redis, dropping");
    return;
  }

  if (broadcast.origin === INSTANCE_ID) return; // already delivered at publish time
  deliverLocally(broadcast);
});

process.on("beforeExit", async () => {
  await subscriber.quit();
});

// ── Init ──────────────────────────────────────────────────────────────────────
export function initWebSocket(server: http.Server) {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (socket: AuthenticatedSocket) => {
    socket.isAlive         = true;
    socket.isAuthenticated = false;

    // The client must authenticate via its first message rather than a
    // ?token= query param — query strings routinely end up in server access
    // logs, reverse-proxy logs, and browser history, which would leak the
    // JWT. See handleAuthMessage below.
    const authTimer = setTimeout(() => {
      if (!socket.isAuthenticated) {
        socket.close(1008, "Authentication timeout");
      }
    }, AUTH_TIMEOUT_MS);

    // Ping/pong heartbeat
    socket.on("pong", () => { socket.isAlive = true; });

    // Handle client messages
    socket.on("message", (data) => {
      let msg: unknown;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        socket.send(JSON.stringify({ event: "ERROR", payload: { message: "Invalid message format" } }));
        return;
      }

      if (!socket.isAuthenticated) {
        handleAuthMessage(socket, msg, authTimer);
        return;
      }

      handleClientMessage(socket, msg);
    });

    // Cleanup on disconnect
    socket.on("close", () => {
      clearTimeout(authTimer);
      if (socket.userId) {
        const conns = userConnections.get(socket.userId);
        conns?.delete(socket);
        if (conns?.size === 0) userConnections.delete(socket.userId);
      }
      adminConnections.delete(socket);
      logger.info(`WS disconnected: userId=${socket.userId ?? "(unauthenticated)"}`);
    });

    // Prompt the client to authenticate
    socket.send(JSON.stringify({
      event:   "AUTH_REQUIRED",
      payload: { message: "Send { type: \"auth\", token }  within 10s to authenticate.", timestamp: Date.now() },
    }));
  });

  // Heartbeat interval — remove dead connections
  const heartbeat = setInterval(() => {
    wss.clients.forEach((ws) => {
      const s = ws as AuthenticatedSocket;
      if (!s.isAlive) { s.terminate(); return; }
      s.isAlive = false;
      s.ping();
    });
  }, 30_000);

  wss.on("close", () => clearInterval(heartbeat));
  logger.info("WebSocket server initialised");
}

// ── Auth handshake (first message only) ───────────────────────────────────────
function handleAuthMessage(socket: AuthenticatedSocket, msg: unknown, authTimer: NodeJS.Timeout) {
  const auth = msg as { type?: string; token?: string };
  if (auth?.type !== "auth" || !auth.token) {
    socket.close(1008, "Authentication required");
    return;
  }

  try {
    const decoded = jwt.verify(auth.token, process.env.JWT_SECRET!, { algorithms: ["HS256"] }) as {
      userId: string; role: string;
    };

    clearTimeout(authTimer);
    socket.isAuthenticated = true;
    socket.userId          = decoded.userId;
    socket.userRole        = decoded.role;

    // Register connection
    if (decoded.role === "admin" || decoded.role === "super_admin") {
      adminConnections.add(socket);
    } else {
      if (!userConnections.has(decoded.userId)) {
        userConnections.set(decoded.userId, new Set());
      }
      userConnections.get(decoded.userId)!.add(socket);
    }

    logger.info(`WS connected: userId=${decoded.userId} role=${decoded.role}`);

    socket.send(JSON.stringify({
      event:   "CONNECTED",
      payload: { message: "Connected to nityasamagri real-time server", timestamp: Date.now() },
    }));
  } catch {
    socket.close(1008, "Invalid token");
  }
}

// ── Client message handler ────────────────────────────────────────────────────
function handleClientMessage(socket: AuthenticatedSocket, msg: unknown) {
  // Future: handle subscribe/unsubscribe to specific order rooms
  logger.debug(`WS message from ${socket.userId}: ${JSON.stringify(msg)}`);
}

// ── Emit helpers (called from service layer) ──────────────────────────────────

/** Send an event to a specific user (all their tabs, on any instance) */
export function emitToUser(userId: string, message: WsMessage) {
  publish({ target: "user", userId, message });
}

/** Broadcast an event to all connected admins (on any instance) */
export function emitToAdmins(message: WsMessage) {
  publish({ target: "admins", message });
}

/** Broadcast to everyone (e.g. flash sales, system alerts) */
export function broadcastAll(message: WsMessage) {
  publish({ target: "all", message });
}

/** Convenience: notify user + admins on order status change */
export function emitOrderUpdate(params: {
  userId:  string;
  orderId: string;
  status:  string;
  data?:   Record<string, unknown>;
}) {
  const message: WsMessage = {
    event:   "ORDER_STATUS_UPDATE",
    payload: { orderId: params.orderId, status: params.status, timestamp: Date.now(), ...params.data },
  };
  emitToUser(params.userId, message);
  emitToAdmins(message);
}