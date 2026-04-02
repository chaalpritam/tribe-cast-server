import { db } from "./db";

interface InsertReactionParams {
  hash: string;
  fid: string;
  type: number;
  targetHash: string;
  timestamp: Date;
}

class ReactionStore {
  async insertReaction(params: InsertReactionParams): Promise<void> {
    await db.query(
      `INSERT INTO reactions (hash, fid, type, target_hash, timestamp)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (hash) DO NOTHING`,
      [params.hash, params.fid, params.type, params.targetHash, params.timestamp]
    );
  }

  async deleteReaction(hash: string): Promise<void> {
    await db.query(
      `UPDATE reactions SET deleted = true WHERE hash = $1`,
      [hash]
    );
  }

  async getReactionByHash(hash: string) {
    const result = await db.query(
      `SELECT hash, fid, type, target_hash, timestamp
       FROM reactions WHERE hash = $1 AND deleted = false`,
      [hash]
    );
    return result.rows[0] || null;
  }
}

export const reactionStore = new ReactionStore();
