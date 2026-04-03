import { FastifyInstance } from "fastify";
import { submitRoutes } from "./submit";
import { tweetRoutes } from "./tweets";
import { reactionRoutes } from "./reactions";
import { healthRoutes } from "./health";

export function registerRoutes(server: FastifyInstance) {
  server.register(healthRoutes);
  server.register(submitRoutes, { prefix: "/v1" });
  server.register(tweetRoutes, { prefix: "/v1" });
  server.register(reactionRoutes, { prefix: "/v1" });
}
