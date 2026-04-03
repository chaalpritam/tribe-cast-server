import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config";
import { registerRoutes } from "./routes";

export async function buildServer() {
  const server = Fastify({ logger: true });

  await server.register(cors, { origin: true });

  await server.register(rateLimit, {
    max: config.rateLimitTweetsPerMin,
    timeWindow: "1 minute",
  });

  registerRoutes(server);

  return server;
}
