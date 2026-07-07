# tribe-cast-server

> **DEPRECATED** — This functionality has been merged into [tribe-hub](https://github.com/chaalpritam/tribe-hub). The hub now handles message storage, signature validation, and gossip peer sync in a single service. This repo is kept for reference only.

GitHub: [chaalpritam/tribe-cast-server](https://github.com/chaalpritam/tribe-cast-server)

Off-chain message storage and validation server for the Tribe protocol. Receives signed protobuf messages, validates signatures against on-chain app keys, and stores casts/messages in PostgreSQL.

## Architecture

```
SDK / Client
    |
    | POST /v1/submitMessage (signed protobuf)
    v
tribe-cast-server (Fastify)
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
| [TribeEco](https://github.com/chaalpritam/TribeEco) | Monorepo — protocol stack, clients, deploy tooling |
| [tribe-protocol](../tribe-protocol) | Solana programs (Anchor) — identity, social graph, registries |
| [tribe-sdk](../tribe-sdk) | TypeScript SDK — DirectSolana and EphemeralRollup providers |
| [tribe-hub](../tribe-hub) | Decentralized hub — message storage, Solana indexer, gossip sync |
| [tribe-er-server](../tribe-er-server) | Ephemeral Rollup sequencer — instant follows, L1 settlement |
| [tribe](../tribe) | Native SwiftUI hyperlocal iOS app (`app.tribe.app`) — city/channel feeds, explore, map, tribes |
| [tribe-twitter](../tribe-twitter) | Native SwiftUI Twitter-shaped iOS app (`app.tribe.twitter`) |
| [tribe-insta](../tribe-insta) | Native SwiftUI Instagram-shaped iOS app — photos, stories, reels |
| [tribe-twitter-app](../tribe-twitter-app) | Next.js reference web client |
| [tribeapp.wtf](../tribeapp.wtf) | Consumer hyperlocal web app + landing page |
| [tribe-core-swift](../tribe-core-swift) | Shared Swift package — crypto, hub API, models (see `MIGRATION.md`) |
| [homebrew-tap](../homebrew-tap) | Homebrew formulas — `brew install tribe`, `brew install tribe-twitter-app` |
## License

MIT
