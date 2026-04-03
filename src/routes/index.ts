import { FastifyInstance } from "fastify";
import { submitRoutes } from "./submit";
import { tweetRoutes } from "./tweets";
import { reactionRoutes } from "./reactions";
import { uploadRoutes } from "./upload";
import { wsRoutes } from "./ws";
import { healthRoutes } from "./health";

export function registerRoutes(server: FastifyInstance) {
  server.register(healthRoutes);
  server.register(wsRoutes, { prefix: "/v1" });
  server.register(submitRoutes, { prefix: "/v1" });
  server.register(tweetRoutes, { prefix: "/v1" });
  server.register(reactionRoutes, { prefix: "/v1" });
  server.register(uploadRoutes, { prefix: "/v1" });
}
