import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config";
import { registerRoutes } from "./routes";

export async function buildServer() {
  const server = Fastify({ logger: true });

  await server.register(cors, { origin: true });

  // Rate limit only applies to POST routes (submissions).
  // GET routes (reads) are not rate-limited.
  await server.register(rateLimit, {
    max: config.rateLimitTweetsPerMin,
    timeWindow: "1 minute",
    allowList: (req) => req.method === "GET",
  });

  registerRoutes(server);

  return server;
}
