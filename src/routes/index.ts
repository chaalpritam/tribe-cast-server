import { FastifyInstance } from "fastify";
import { submitRoutes } from "./submit";
import { castRoutes } from "./casts";
import { reactionRoutes } from "./reactions";
import { healthRoutes } from "./health";

export function registerRoutes(server: FastifyInstance) {
  server.register(healthRoutes);
  server.register(submitRoutes, { prefix: "/v1" });
  server.register(castRoutes, { prefix: "/v1" });
  server.register(reactionRoutes, { prefix: "/v1" });
}
