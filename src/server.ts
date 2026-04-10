import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config";
import { registerRoutes } from "./routes";

export async function buildServer() {
  const server = Fastify({ logger: true });

  await server.register(cors, { origin: true });

  // Rate limit all endpoints. POST has stricter limits via per-route overrides.
  await server.register(rateLimit, {
    max: 200,
    timeWindow: "1 minute",
    keyGenerator: (req) => req.ip,
  });

  // Stricter rate limit for POST (message submissions)
  server.addHook("onRoute", (routeOptions) => {
    if (routeOptions.method === "POST" || (Array.isArray(routeOptions.method) && routeOptions.method.includes("POST"))) {
      const existingConfig = routeOptions.config ?? {};
      routeOptions.config = {
        ...existingConfig,
        rateLimit: { max: config.rateLimitTweetsPerMin, timeWindow: "1 minute" },
      };
    }
  });

  registerRoutes(server);

  return server;
}
