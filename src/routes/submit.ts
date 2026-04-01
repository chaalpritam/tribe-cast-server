import { FastifyInstance } from "fastify";
import { SubmitMessageRequest } from "../types";
import { validateMessage } from "../validation/message-validator";
import { castStore } from "../storage/cast-store";

export async function submitRoutes(server: FastifyInstance) {
  server.post<{ Body: SubmitMessageRequest }>("/submitMessage", async (request, reply) => {
    const message = request.body;

    // Validate message signature and app key.
    const validation = await validateMessage(message);
    if (!validation.valid) {
      return reply.status(400).send({ error: validation.error });
    }

    // Store based on message type.
    const messageType = message.data.type;
    if (messageType === 1) {
      // CAST_ADD
      const body = message.data.body as { text: string; mentions?: string[]; embeds?: string[]; parent_hash?: string; channel_id?: string };
      await castStore.insertCast({
        hash: message.hash,
        fid: message.data.fid,
        text: body.text,
        parentHash: body.parent_hash || null,
        channelId: body.channel_id || null,
        mentions: body.mentions || [],
        embeds: body.embeds || [],
        timestamp: new Date(message.data.timestamp * 1000),
      });
    }

    return { hash: message.hash };
  });
}
