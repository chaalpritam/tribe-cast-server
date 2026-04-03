import { FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import { createHash } from "crypto";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

// Simple local storage for uploaded files.
// In production, replace with IPFS pinning (Pinata, web3.storage) or Arweave.
const uploads = new Map<string, { data: Buffer; contentType: string; createdAt: Date }>();

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

    // Content-addressed: SHA-256 hash of the file data
    const hash = createHash("sha256").update(data).digest("hex");

    uploads.set(hash, {
      data,
      contentType: file.mimetype,
      createdAt: new Date(),
    });

    return {
      hash,
      url: `/v1/media/${hash}`,
      contentType: file.mimetype,
      size: data.length,
    };
  });

  // Serve uploaded media by hash
  server.get<{ Params: { hash: string } }>("/media/:hash", async (request, reply) => {
    const upload = uploads.get(request.params.hash);
    if (!upload) {
      return reply.status(404).send({ error: "Media not found" });
    }

    reply.header("Content-Type", upload.contentType);
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
    return reply.send(upload.data);
  });
}
