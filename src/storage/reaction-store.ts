import { db } from "./db";

interface InsertReactionParams {
  hash: string;
  tid: string;
  type: number;
  targetHash: string;
  timestamp: Date;
}

class ReactionStore {
  async insertReaction(params: InsertReactionParams): Promise<void> {
    await db.query(
      `INSERT INTO reactions (hash, tid, type, target_hash, timestamp)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (hash) DO NOTHING`,
      [params.hash, params.tid, params.type, params.targetHash, params.timestamp]
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
      `SELECT hash, tid, type, target_hash, timestamp
       FROM reactions WHERE hash = $1 AND deleted = false`,
      [hash]
    );
    return result.rows[0] || null;
  }
}

export const reactionStore = new ReactionStore();
