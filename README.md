# tribe-tweet-server

Off-chain message storage and validation server for the Tribe protocol. Receives signed protobuf messages, validates signatures against on-chain app keys, and stores tweets in PostgreSQL.

## Architecture

```
SDK / Client
    |
    | POST /v1/submitMessage (signed protobuf)
    v
tribe-tweet-server (Fastify)
    |
    ├── Message Validation
    |   ├── ed25519 signature verification
    |   ├── App key lookup from Solana (tid-registry + app-key-registry)
    |   ├── Duplicate hash detection
    |   └── Rate limiting (per IP)
    |
    └── PostgreSQL Storage
        ├── tweets table
        └── reactions table
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/submitMessage` | Submit a signed protobuf message (`TWEET_ADD`, `TWEET_REMOVE`, `REACTION_ADD`, `REACTION_REMOVE`) |
| GET | `/v1/tweetsByTid/:tid?cursor=&limit=` | Paginated tweets by TID |
| GET | `/v1/tweet/:hash` | Single tweet by hash |
| GET | `/v1/reactionsByTarget/:hash` | Reactions on a tweet |
| GET | `/health` | Health check |

## Getting Started

### Docker (recommended)

```bash
docker-compose up
```

This starts PostgreSQL and the tweet server on port 3000.

### Manual

Requires PostgreSQL 16+.

```bash
cp .env.example .env   # edit as needed
pnpm install
pnpm run migrate
pnpm run dev
```

## Configuration

Copy `.env.example` to `.env` and adjust as needed.

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP server port |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `SOLANA_CLUSTER` | — | Solana cluster (e.g. `devnet`, `mainnet-beta`) |
| `SOLANA_RPC_URL` | — | Solana JSON-RPC endpoint |
| `RATE_LIMIT_TWEETS_PER_MIN` | `10` | Max tweet submissions per IP per minute |
| `RATE_LIMIT_REACTIONS_PER_MIN` | `60` | Max reaction submissions per IP per minute |
| `TID_REGISTRY_PROGRAM_ID` | — | On-chain TID registry program address |
| `APP_KEY_REGISTRY_PROGRAM_ID` | — | On-chain app-key registry program address |
| `MAX_TWEETS_PER_TID` | `10000` | Per-TID storage cap |

## Database Schema

### tweets

| Column | Type | Notes |
|--------|------|-------|
| `hash` | `TEXT` | Primary key |
| `tid` | `BIGINT` | Tribe ID |
| `text` | `TEXT` | Tweet body |
| `parent_hash` | `TEXT` | Null for top-level tweets |
| `channel_id` | `TEXT` | Optional channel |
| `mentions` | `TEXT[]` | Mentioned TIDs |
| `embeds` | `TEXT[]` | Embedded URLs |
| `timestamp` | `BIGINT` | Client-supplied timestamp |
| `created_at` | `TIMESTAMPTZ` | Server insert time |
| `deleted` | `BOOLEAN` | Soft-delete flag |

### reactions

Stores `REACTION_ADD` and `REACTION_REMOVE` events keyed by target tweet hash.

## Validation Rules

- Tweet text must be at most 320 characters.
- ed25519 signature must match a registered app key for the TID.
- App key must be active (not revoked, not expired).
- Duplicate hash is rejected.
- Per-TID storage limit enforced (default 10,000 tweets).

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start in development mode with hot reload |
| `pnpm run build` | Compile TypeScript |
| `pnpm run start` | Run compiled output |
| `pnpm run test` | Run test suite |
| `pnpm run migrate` | Apply database migrations |

## Tech Stack

- **Fastify** -- HTTP framework
- **PostgreSQL 16** -- persistent storage
- **Solana web3.js** -- on-chain reads for key validation
- **tweetnacl** -- ed25519 signature verification
- **protobufjs** -- message encoding/decoding

## Related Repos

- [tribe-protocol](../tribe-protocol) -- Solana programs (Anchor)
- [tribe-sdk](../tribe-sdk) -- TypeScript SDK
- [tribe-indexer](../tribe-indexer) -- Event indexer + read API

## License

MIT
