import { FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { WebSocket } from "ws";

// All connected WebSocket clients
const clients = new Set<WebSocket>();

/**
 * Broadcast a message to all connected WebSocket clients.
 * Called when a new tweet or reaction is submitted.
 */
export function broadcast(event: string, data: unknown): void {
  const message = JSON.stringify({ event, data });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

export async function wsRoutes(server: FastifyInstance) {
  await server.register(websocket);

  server.get("/ws", { websocket: true }, (socket) => {
    clients.add(socket);

    socket.on("close", () => {
      clients.delete(socket);
    });

    socket.on("error", () => {
      clients.delete(socket);
    });

    // Send a welcome message
    socket.send(JSON.stringify({ event: "connected", data: { clients: clients.size } }));
  });
}
