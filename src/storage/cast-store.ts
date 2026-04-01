import { db } from "./db";

interface InsertCastParams {
  hash: string;
  fid: string;
  text: string;
  parentHash: string | null;
  channelId: string | null;
  mentions: string[];
  embeds: string[];
  timestamp: Date;
}

class CastStore {
  async insertCast(params: InsertCastParams): Promise<void> {
    await db.query(
      `INSERT INTO casts (hash, fid, text, parent_hash, channel_id, mentions, embeds, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (hash) DO NOTHING`,
      [
        params.hash,
        params.fid,
        params.text,
        params.parentHash,
        params.channelId,
        params.mentions,
        params.embeds,
        params.timestamp,
      ]
    );
  }

  async getCastsByFid(fid: string, limit: number, cursor?: string) {
    const params: (string | number)[] = [fid, limit];
    let query = `
      SELECT hash, fid, text, parent_hash, channel_id, mentions, embeds, timestamp
      FROM casts
      WHERE fid = $1 AND deleted = false
    `;
    if (cursor) {
      query += ` AND hash < $3`;
      params.push(cursor);
    }
    query += ` ORDER BY timestamp DESC LIMIT $2`;

    const result = await db.query(query, params);
    return result.rows;
  }

  async getCastByHash(hash: string) {
    const result = await db.query(
      `SELECT hash, fid, text, parent_hash, channel_id, mentions, embeds, timestamp
       FROM casts WHERE hash = $1 AND deleted = false`,
      [hash]
    );
    return result.rows[0] || null;
  }
}

export const castStore = new CastStore();
