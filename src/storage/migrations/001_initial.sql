CREATE TABLE IF NOT EXISTS casts (
  hash        TEXT PRIMARY KEY,
  fid         BIGINT NOT NULL,
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
  fid         BIGINT NOT NULL,
  type        INT NOT NULL,
  target_hash TEXT NOT NULL,
  timestamp   TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted     BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_casts_fid ON casts (fid, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_casts_channel ON casts (channel_id, timestamp DESC) WHERE channel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_casts_parent ON casts (parent_hash) WHERE parent_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_reactions_target ON reactions (target_hash, type);
CREATE INDEX IF NOT EXISTS idx_reactions_fid ON reactions (fid, timestamp DESC);
