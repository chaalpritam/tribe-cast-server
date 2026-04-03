import { FastifyInstance } from "fastify";
import { tweetStore } from "../storage/tweet-store";

export async function tweetRoutes(server: FastifyInstance) {
  // Recent tweets (used by indexer polling)
  server.get<{
    Querystring: { limit?: string; after?: string };
  }>("/tweets/recent", async (request) => {
    const limit = Math.min(parseInt(request.query.limit || "50", 10), 200);
    const after = request.query.after;
    const tweets = await tweetStore.getRecentTweets(limit, after);
    return { tweets };
  });

  // Global feed — all tweets, newest first
  server.get<{
    Querystring: { limit?: string; cursor?: string };
  }>("/tweets", async (request) => {
    const limit = Math.min(parseInt(request.query.limit || "20", 10), 100);
    const cursor = request.query.cursor;
    const tweets = await tweetStore.getAllTweets(limit, cursor);
    return { tweets, cursor: tweets.length === limit ? tweets[tweets.length - 1]?.timestamp : undefined };
  });

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

  // Supports both /tweet/:hash (path param) and /tweet?hash=... (query param)
  // Use query param for hashes containing / or +
  server.get<{ Params: { hash: string }; Querystring: { hash?: string } }>("/tweet/:hash", async (request, reply) => {
    const hash = request.params.hash;
    const tweet = await tweetStore.getTweetByHash(hash);
    if (!tweet) return reply.status(404).send({ error: "Tweet not found" });
    return tweet;
  });

  server.get<{ Querystring: { hash: string } }>("/tweet", async (request, reply) => {
    const hash = request.query.hash;
    if (!hash) return reply.status(400).send({ error: "hash query parameter required" });
    const tweet = await tweetStore.getTweetByHash(hash);
    if (!tweet) return reply.status(404).send({ error: "Tweet not found" });
    return tweet;
  });
}
