import { FastifyInstance } from "fastify";
import { tweetStore } from "../storage/tweet-store";

export async function tweetRoutes(server: FastifyInstance) {
  server.get<{
    Params: { tid: string };
    Querystring: { limit?: string; cursor?: string };
  }>("/tweetsByTid/:tid", async (request) => {
    const tid = request.params.tid;
    const limit = Math.min(parseInt(request.query.limit || "20", 10), 100);
    const cursor = request.query.cursor;

    const tweets = await tweetStore.getTweetsByTid(tid, limit, cursor);
    return { tweets, cursor: tweets.length === limit ? tweets[tweets.length - 1]?.hash : undefined };
  });

  server.get<{ Params: { hash: string } }>("/tweet/:hash", async (request, reply) => {
    const tweet = await tweetStore.getTweetByHash(request.params.hash);
    if (!tweet) return reply.status(404).send({ error: "Tweet not found" });
    return tweet;
  });
}
