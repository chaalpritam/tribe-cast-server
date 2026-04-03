import { FastifyInstance } from "fastify";
import { SubmitMessageRequest } from "../types";
import { validateMessage } from "../validation/message-validator";
import { tweetStore } from "../storage/tweet-store";
import { reactionStore } from "../storage/reaction-store";

// Message types (matching proto/SDK enum)
const TWEET_ADD = 1;
const TWEET_REMOVE = 2;
const REACTION_ADD = 3;
const REACTION_REMOVE = 4;

export async function submitRoutes(server: FastifyInstance) {
  server.post<{ Body: SubmitMessageRequest }>("/submitMessage", async (request, reply) => {
    const message = request.body;

    // Validate message signature, app key, dedup, and storage limits.
    const validation = await validateMessage(message);
    if (!validation.valid) {
      return reply.status(400).send({ error: validation.error });
    }

    const messageType = message.data.type;

    switch (messageType) {
      case TWEET_ADD: {
        const body = message.data.body as {
          text: string;
          mentions?: string[];
          embeds?: string[];
          parent_hash?: string;
          channel_id?: string;
        };
        await tweetStore.insertTweet({
          hash: message.hash,
          tid: message.data.tid,
          text: body.text,
          parentHash: body.parent_hash || null,
          channelId: body.channel_id || null,
          mentions: body.mentions || [],
          embeds: body.embeds || [],
          timestamp: new Date(message.data.timestamp * 1000),
        });
        break;
      }

      case TWEET_REMOVE: {
        const body = message.data.body as { target_hash: string };
        if (!body.target_hash) {
          return reply.status(400).send({ error: "target_hash is required for TWEET_REMOVE" });
        }
        await tweetStore.deleteTweet(body.target_hash);
        break;
      }

      case REACTION_ADD: {
        const body = message.data.body as { type: number; target_hash: string };
        if (!body.target_hash || !body.type) {
          return reply.status(400).send({ error: "type and target_hash are required for REACTION_ADD" });
        }
        await reactionStore.insertReaction({
          hash: message.hash,
          tid: message.data.tid,
          type: body.type,
          targetHash: body.target_hash,
          timestamp: new Date(message.data.timestamp * 1000),
        });
        break;
      }

      case REACTION_REMOVE: {
        const body = message.data.body as { target_hash: string };
        if (!body.target_hash) {
          return reply.status(400).send({ error: "target_hash is required for REACTION_REMOVE" });
        }
        await reactionStore.deleteReaction(body.target_hash);
        break;
      }

      default:
        return reply.status(400).send({ error: `Unsupported message type: ${messageType}` });
    }

    return { hash: message.hash };
  });
}
