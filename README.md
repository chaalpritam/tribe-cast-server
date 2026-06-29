# tribe-tweet-server

> **DEPRECATED** — This functionality has been merged into [tribe-hub](https://github.com/chaalpritam/tribe-hub). The hub now handles tweet storage, signature validation, and gossip peer sync in a single service. This repo is kept for reference only.

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

| Repo | Description |
|------|-------------|
| [tribe-protocol](../tribe-protocol) | Solana programs (Anchor) — 12 programs: tid-registry, app-key-registry, username-registry, social-graph w/ ER delegation, hub-registry, tip-registry, crowdfund-registry, task-registry, channel-registry, karma-registry, poll-registry, event-registry |
| [tribe-sdk](../tribe-sdk) | TypeScript SDK — DirectSolana and EphemeralRollup providers; clients for identity, tweets, DMs, profiles, channels, bookmarks, polls, events, tasks, crowdfunds, tips, search |
| [tribe-hub](../tribe-hub) | Decentralized hub — signed-message storage + Solana indexer + gossip peer sync; REST + WebSocket APIs |
| [tribe-er-server](../tribe-er-server) | Ephemeral Rollup sequencer — instant follows, batched L1 settlement every 10s |
| [tribe-app](../tribe-app) | Next.js frontend — protocol-first reference client with multi-node failover |
| [tribeapp.wtf](../tribeapp.wtf) | Consumer-facing web app + landing page at tribeapp.wtf — hyperlocal social built entirely on the protocol |
| [tribe-twitter](../tribe-twitter) | Native SwiftUI iOS client (Twitter-shaped) — full read/write against hub + ER, NaCl-box DMs, BLAKE3 + ed25519 signing via Apple CryptoKit |
| [tribe-insta](../tribe-insta) | Native SwiftUI iOS client (Instagram-shaped) — photo grid, stories, reels; same hub + envelope format as tribe-twitter. Scaffolding stage — see `tribe-insta/PLAN.md` |
| [tribe-core-swift](../tribe-core-swift) | Shared Swift package consumed by tribe-twitter + tribe-insta — crypto (BLAKE3, NaCl box, ed25519 signing, BIP39, SolanaHD), backup file format, envelope signer. See `tribe-core-swift/MIGRATION.md` |
| [homebrew-tap](../homebrew-tap) | Homebrew formulas: `brew install tribe` (hub + ER) and `brew install tribe-app` (demo UI) |
## License

MIT
