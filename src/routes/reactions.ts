import { FastifyInstance } from "fastify";
import { db } from "../storage/db";

export async function reactionRoutes(server: FastifyInstance) {
  server.get<{
    Params: { hash: string };
    Querystring: { limit?: string; cursor?: string };
  }>("/reactionsByTarget/:hash", async (request) => {
    const targetHash = request.params.hash;
    const limit = Math.min(parseInt(request.query.limit || "20", 10), 100);

    const result = await db.query(
      `SELECT hash, tid, type, target_hash, timestamp
       FROM reactions
       WHERE target_hash = $1 AND deleted = false
       ORDER BY timestamp DESC
       LIMIT $2`,
      [targetHash, limit]
    );

    return { reactions: result.rows };
  });
}
