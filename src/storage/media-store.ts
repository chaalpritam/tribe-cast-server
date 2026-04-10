import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";
import { config } from "../config";

interface MediaRecord {
  contentType: string;
  size: number;
  createdAt: string;
  ipfsCid?: string;
}

/**
 * Content-addressable media storage.
 *
 * Default: local disk (data/media/{hash[0:2]}/{hash})
 * Optional: IPFS pinning via HTTP API (set MEDIA_STORAGE=ipfs)
 *
 * Files are named by SHA-256 hash of their content, making them
 * immutable and deduplicatable.
 */
class MediaStore {
  private metaCache = new Map<string, MediaRecord>();

  constructor() {
    if (config.mediaStorage === "disk") {
      mkdirSync(config.mediaDir, { recursive: true });
    }
  }

  /**
   * Store media data. Returns the content hash.
   */
  async store(data: Buffer, contentType: string): Promise<{ hash: string; ipfsCid?: string }> {
    const hash = createHash("sha256").update(data).digest("hex");

    // Skip if already stored (content-addressable = idempotent)
    if (this.exists(hash)) {
      const meta = this.getMeta(hash);
      return { hash, ipfsCid: meta?.ipfsCid };
    }

    let ipfsCid: string | undefined;

    if (config.mediaStorage === "ipfs") {
      ipfsCid = await this.pinToIpfs(data);
    }

    // Always write to disk as local cache/fallback
    this.writeToDisk(hash, data);
    this.writeMeta(hash, { contentType, size: data.length, createdAt: new Date().toISOString(), ipfsCid });

    return { hash, ipfsCid };
  }

  /**
   * Retrieve media data by hash.
   */
  retrieve(hash: string): { data: Buffer; contentType: string } | null {
    const meta = this.getMeta(hash);
    if (!meta) return null;

    const filePath = this.filePath(hash);
    if (!existsSync(filePath)) return null;

    return {
      data: readFileSync(filePath),
      contentType: meta.contentType,
    };
  }

  /**
   * Check if a hash exists in the store.
   */
  exists(hash: string): boolean {
    return existsSync(this.filePath(hash));
  }

  /**
   * Get the IPFS gateway URL for a hash (if stored on IPFS).
   */
  getIpfsUrl(hash: string): string | null {
    const meta = this.getMeta(hash);
    if (!meta?.ipfsCid) return null;
    return `${config.ipfsGatewayUrl}/${meta.ipfsCid}`;
  }

  // --- Internal helpers ---

  private filePath(hash: string): string {
    // Shard into subdirectories by first 2 chars to avoid huge flat dirs
    const shard = hash.substring(0, 2);
    return join(config.mediaDir, shard, hash);
  }

  private metaPath(hash: string): string {
    const shard = hash.substring(0, 2);
    return join(config.mediaDir, shard, `${hash}.json`);
  }

  private writeToDisk(hash: string, data: Buffer): void {
    const shard = hash.substring(0, 2);
    const shardDir = join(config.mediaDir, shard);
    mkdirSync(shardDir, { recursive: true });
    writeFileSync(this.filePath(hash), data);
  }

  private writeMeta(hash: string, meta: MediaRecord): void {
    this.metaCache.set(hash, meta);
    writeFileSync(this.metaPath(hash), JSON.stringify(meta));
  }

  private getMeta(hash: string): MediaRecord | null {
    // Check in-memory cache first
    const cached = this.metaCache.get(hash);
    if (cached) return cached;

    // Read from disk
    const metaFile = this.metaPath(hash);
    if (!existsSync(metaFile)) return null;

    try {
      const meta = JSON.parse(readFileSync(metaFile, "utf-8")) as MediaRecord;
      this.metaCache.set(hash, meta);
      return meta;
    } catch {
      // Corrupted metadata file — treat as missing
      return null;
    }
  }

  /**
   * Pin file data to IPFS via the HTTP API.
   * Requires a running IPFS node (or Pinata/web3.storage compatible API).
   */
  private async pinToIpfs(data: Buffer): Promise<string> {
    const formData = new FormData();
    formData.append("file", new Blob([data]));

    const res = await fetch(`${config.ipfsApiUrl}/api/v0/add?pin=true`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`IPFS pin failed: ${res.status} ${await res.text()}`);
    }

    const result = (await res.json()) as { Hash: string };
    return result.Hash;
  }
}

export const mediaStore = new MediaStore();
