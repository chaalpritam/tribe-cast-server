import { db } from "./db";
import { config } from "../config";

interface InsertTweetParams {
  hash: string;
  tid: string;
  text: string;
  parentHash: string | null;
  channelId: string | null;
  mentions: string[];
  embeds: string[];
  timestamp: Date;
}

class TweetStore {
  async insertTweet(params: InsertTweetParams): Promise<void> {
    await db.query(
      `INSERT INTO tweets (hash, tid, text, parent_hash, channel_id, mentions, embeds, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (hash) DO NOTHING`,
      [
        params.hash,
        params.tid,
        params.text,
        params.parentHash,
        params.channelId,
        params.mentions,
        params.embeds,
        params.timestamp,
      ]
    );
  }

  async deleteTweet(hash: string): Promise<void> {
    await db.query(
      `UPDATE tweets SET deleted = true WHERE hash = $1`,
      [hash]
    );
  }

  async hashExists(hash: string): Promise<boolean> {
    const result = await db.query(
      `SELECT 1 FROM tweets WHERE hash = $1 LIMIT 1`,
      [hash]
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getTweetCountByTid(tid: string): Promise<number> {
    const result = await db.query(
      `SELECT COUNT(*)::int AS count FROM tweets WHERE tid = $1 AND deleted = false`,
      [tid]
    );
    return result.rows[0]?.count ?? 0;
  }

  async isStorageLimitReached(tid: string): Promise<boolean> {
    const count = await this.getTweetCountByTid(tid);
    return count >= config.maxTweetsPerTid;
  }

  async getTweetsByTid(tid: string, limit: number, cursor?: string) {
    const params: (string | number)[] = [tid, limit];
    let query = `
      SELECT hash, tid, text, parent_hash, channel_id, mentions, embeds, timestamp
      FROM tweets
      WHERE tid = $1 AND deleted = false
    `;
    if (cursor) {
      query += ` AND hash < $3`;
      params.push(cursor);
    }
    query += ` ORDER BY timestamp DESC LIMIT $2`;

    const result = await db.query(query, params);
    return result.rows;
  }

  async getAllTweets(limit: number, cursor?: string) {
    const params: (string | number)[] = [limit];
    let query = `
      SELECT t.hash, t.tid, t.text, t.parent_hash, t.channel_id, t.mentions, t.embeds, t.timestamp,
             (SELECT COUNT(*)::int FROM tweets r WHERE r.parent_hash = t.hash AND r.deleted = false) as reply_count
      FROM tweets t WHERE t.deleted = false
    `;
    if (cursor) {
      query += ` AND t.timestamp < $2`;
      params.push(cursor);
    }
    query += ` ORDER BY t.timestamp DESC LIMIT $1`;
    const result = await db.query(query, params);
    return result.rows;
  }

  async getRecentTweets(limit: number, afterTimestamp?: string) {
    const params: (string | number)[] = [limit];
    let query = `
      SELECT hash, tid, text, parent_hash, channel_id, mentions, embeds, timestamp
      FROM tweets WHERE deleted = false
    `;
    if (afterTimestamp) {
      query += ` AND timestamp > $2`;
      params.push(afterTimestamp);
    }
    query += ` ORDER BY timestamp ASC LIMIT $1`;

    const result = await db.query(query, params);
    return result.rows;
  }

  async getReplies(parentHash: string, limit: number, cursor?: string) {
    const params: (string | number)[] = [parentHash, limit];
    let query = `
      SELECT hash, tid, text, parent_hash, channel_id, mentions, embeds, timestamp
      FROM tweets WHERE parent_hash = $1 AND deleted = false
    `;
    if (cursor) {
      query += ` AND timestamp > $3`;
      params.push(cursor);
    }
    query += ` ORDER BY timestamp ASC LIMIT $2`;
    const result = await db.query(query, params);
    return result.rows;
  }

  async getReplyCount(parentHash: string): Promise<number> {
    const result = await db.query(
      `SELECT COUNT(*)::int AS count FROM tweets WHERE parent_hash = $1 AND deleted = false`,
      [parentHash]
    );
    return result.rows[0]?.count ?? 0;
  }

  async getTweetByHash(hash: string) {
    const result = await db.query(
      `SELECT hash, tid, text, parent_hash, channel_id, mentions, embeds, timestamp
       FROM tweets WHERE hash = $1 AND deleted = false`,
      [hash]
    );
    return result.rows[0] || null;
  }
}

export const tweetStore = new TweetStore();
