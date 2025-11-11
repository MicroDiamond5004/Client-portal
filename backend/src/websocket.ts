import { WebSocketServer, WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";
import {
  getWebsocketSession,
  createWebsocketSession,
  deleteWebsocketSession,
} from "./data/mongodbStorage"; // adjust import path

// === Active connections ===
// email -> Set of { socket, id }
const socketConnections = new Map<
  string,
  Set<{ socket: WebSocket; id: string }>
>();
const disconnectTimers = new Map<string, NodeJS.Timeout>();

export function initWebSocket(server: any) {
  const wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("connection", (ws: WebSocket) => {
    const socketId = uuidv4();
    console.log(`🔌 WebSocket connected: ${socketId}`);

    ws.on("message", async (data) => {
      try {
        const msg = JSON.parse(data.toString());

        // === INITIAL REGISTRATION ===
        if ((msg.type === "init" || msg.type === "register") && msg.userId && msg.email) {
          const { userId, email, orderType = "my", search = "" } = msg;
          console.log(`⚡ Registering session for ${email} (${socketId})`);

          // Cancel disconnect timeout if any
          if (disconnectTimers.has(socketId)) {
            clearTimeout(disconnectTimers.get(socketId)!);
            disconnectTimers.delete(socketId);
          }

          // Create or update session (unique per socketId)
          await createWebsocketSession({
            id: socketId,
            email,
            userId,
            orderType,
            start: Date.now(),
            end: 0,
            dateStart: new Date(),
            dateEnd: new Date(),
            search,
            orderIds: [],
          } as any);

          // Track connection by email
          if (!socketConnections.has(email)) socketConnections.set(email, new Set());
          socketConnections.get(email)!.add({ socket: ws, id: socketId });

          ws.send(JSON.stringify({ type: "registered", email, id: socketId }));
        }

        // === EXPLICIT DISCONNECT ===
        else if (msg.type === "disconnect" && msg.email && msg.id) {
          const { email, id } = msg;

          await deleteWebsocketSession(id);

          const emailSet = socketConnections.get(email);
          if (emailSet) {
            // Remove this socket from the set
            for (const entry of emailSet) {
              if (entry.id === id) {
                if (entry.socket.readyState === WebSocket.OPEN) entry.socket.close();
                emailSet.delete(entry);
                break;
              }
            }

            if (emailSet.size === 0) socketConnections.delete(email);
          }

          ws.close();
          console.log(`🛑 Explicit disconnect: email=${email}, id=${id}`);
        }
      } catch (e) {
        console.warn("❌ Error handling message:", e);
      }
    });

    // === AUTOMATIC DISCONNECT ===
    ws.on("close", async () => {
      const emailEntry = [...socketConnections.entries()].find(([_, set]) =>
        [...set].some((entry) => entry.socket === ws)
      );

      if (!emailEntry) return;

      const [email, connections] = emailEntry;
      const connection = [...connections].find((entry) => entry.socket === ws);
      if (!connection) return;

      const { id } = connection;
      connections.delete(connection);

      console.log(`❌ WebSocket closed: ${id}, email=${email}`);

      if (connections.size === 0) {
        socketConnections.delete(email);
      }

      // Delete from DB after timeout (if not reconnected)
      const timeout = setTimeout(async () => {
        await deleteWebsocketSession(id);
        disconnectTimers.delete(id);
        console.log(`🗑 Session removed from DB id=${id}, email=${email}`);
      }, 5000);

      disconnectTimers.set(id, timeout);
    });
  });

  console.log("✅ WebSocket server running at /ws");
}

// === SEND MESSAGE TO ALL SOCKETS OF A USER ===
export function sendToUser(websocketIds: string[], email: string, payload: any) {
  const data = JSON.stringify(payload);
  const connections = socketConnections.get(email);

  if (!connections || connections.size === 0) {
    console.log(`⚠ No active sockets for email=${email}`);
    return;
  }

  // Convert Set → Array and filter by id
  const sockets = Array.from(connections).filter(conn =>
    websocketIds.includes(conn.id)
  );

  console.log("Sending to sockets:", sockets.map(s => s.id));

  if (sockets.length === 0) {
    console.log(`⚠ No matching websocket IDs for email=${email}`);
    return;
  }

  for (const { socket } of sockets) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  }
}

