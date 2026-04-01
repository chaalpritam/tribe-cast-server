import { FastifyInstance } from "fastify";
import { castStore } from "../storage/cast-store";

export async function castRoutes(server: FastifyInstance) {
  server.get<{
    Params: { fid: string };
    Querystring: { limit?: string; cursor?: string };
  }>("/castsByFid/:fid", async (request) => {
    const fid = request.params.fid;
    const limit = Math.min(parseInt(request.query.limit || "20", 10), 100);
    const cursor = request.query.cursor;

    const casts = await castStore.getCastsByFid(fid, limit, cursor);
    return { casts, cursor: casts.length === limit ? casts[casts.length - 1]?.hash : undefined };
  });

  server.get<{ Params: { hash: string } }>("/cast/:hash", async (request, reply) => {
    const cast = await castStore.getCastByHash(request.params.hash);
    if (!cast) return reply.status(404).send({ error: "Cast not found" });
    return cast;
  });
}
