CREATE TABLE IF NOT EXISTS tweets (
  hash        TEXT PRIMARY KEY,
  tid         BIGINT NOT NULL,
  text        TEXT NOT NULL,
  parent_hash TEXT,
  channel_id  TEXT,
  mentions    BIGINT[] DEFAULT '{}',
  embeds      TEXT[] DEFAULT '{}',
  timestamp   TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted     BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS reactions (
  hash        TEXT PRIMARY KEY,
  tid         BIGINT NOT NULL,
  type        INT NOT NULL,
  target_hash TEXT NOT NULL,
  timestamp   TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted     BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_tweets_tid ON tweets (tid, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tweets_channel ON tweets (channel_id, timestamp DESC) WHERE channel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tweets_parent ON tweets (parent_hash) WHERE parent_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions (target_hash, type);
CREATE INDEX IF NOT EXISTS idx_reactions_tid ON reactions (tid, timestamp DESC);
