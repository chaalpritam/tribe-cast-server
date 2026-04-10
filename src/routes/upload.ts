import { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { mediaStore } from "../storage/media-store";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function uploadRoutes(server: FastifyInstance) {
  await server.register(multipart, {
    limits: { fileSize: MAX_FILE_SIZE },
  });

  // Upload an image, returns a content-addressed hash as the ID
  server.post("/upload", async (request, reply) => {
    const file = await request.file();
    if (!file) {
      return reply.status(400).send({ error: "No file provided" });
    }

    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return reply
        .status(400)
        .send({ error: `Unsupported file type: ${file.mimetype}. Allowed: ${ALLOWED_TYPES.join(", ")}` });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk);
    }
    const data = Buffer.concat(chunks);

    if (data.length > MAX_FILE_SIZE) {
      return reply.status(400).send({ error: "File too large (max 5MB)" });
    }

    const result = await mediaStore.store(data, file.mimetype);

    return {
      hash: result.hash,
      url: `/v1/media/${result.hash}`,
      contentType: file.mimetype,
      size: data.length,
      ...(result.ipfsCid ? { ipfsCid: result.ipfsCid, ipfsUrl: mediaStore.getIpfsUrl(result.hash) } : {}),
    };
  });

  // Serve uploaded media by hash
  server.get<{ Params: { hash: string } }>("/media/:hash", async (request, reply) => {
    const hash = request.params.hash;

    // Validate hash format (SHA-256 hex = 64 chars)
    if (!/^[a-f0-9]{64}$/.test(hash)) {
      return reply.status(400).send({ error: "Invalid hash format" });
    }

    const media = mediaStore.retrieve(hash);
    if (!media) {
      // If IPFS is configured and file not local, redirect to IPFS gateway
      const ipfsUrl = mediaStore.getIpfsUrl(hash);
      if (ipfsUrl) {
        return reply.redirect(ipfsUrl);
      }
      return reply.status(404).send({ error: "Media not found" });
    }

    reply.header("Content-Type", media.contentType);
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
    return reply.send(media.data);
  });
}
