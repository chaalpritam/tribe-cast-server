export interface SubmitMessageRequest {
  protocolVersion: number;
  data: {
    type: number;
    tid: string; // bigint as string
    timestamp: number;
    network: number;
    body: Record<string, unknown>;
  };
  hash: string;      // base64
  signature: string;  // base64
  signer: string;     // base64
}

export interface TweetRow {
  hash: string;
  tid: string;
  text: string;
  parent_hash: string | null;
  channel_id: string | null;
  mentions: string[];
  embeds: string[];
  timestamp: Date;
  deleted: boolean;
  created_at: Date;
}

export interface ReactionRow {
  hash: string;
  tid: string;
  type: number;
  target_hash: string;
  timestamp: Date;
  deleted: boolean;
  created_at: Date;
}
