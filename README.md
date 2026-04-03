# Tribe Tweet Server

HTTP server for storing and serving tweet messages (posts, replies, reactions) for [Tribe Protocol](../tribe-protocol).

In the prototype phase, this replaces the full Go/libp2p P2P network with a simple Fastify + Postgres server behind the same API contract.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/v1/submitMessage` | Submit a signed protobuf message |
| GET | `/v1/tweetsByTid/:tid` | Paginated tweets by TID |
| GET | `/v1/tweet/:hash` | Single tweet by hash |
| GET | `/v1/reactionsByTarget/:hash` | Reactions on a tweet |
| GET | `/health` | Health check |

## Setup

### Docker (recommended)

```bash
docker-compose up
```

This starts Postgres + the tweet server on port 3000.

### Manual

```bash
# Start Postgres
# Create database: tribe_tweets
# Run migration:
psql $DATABASE_URL -f src/storage/migrations/001_initial.sql

# Install and run
pnpm install
cp .env.example .env  # edit as needed
pnpm dev
```

## Message Validation

Every submitted message is validated:
1. **ed25519 signature** verified against signer pubkey
2. **App key lookup** -- signer must be a registered app key for the TID (cached from Solana)
3. **Duplicate check** -- reject messages with existing hash
4. **Rate limiting** -- per-IP limits via @fastify/rate-limit

## Configuration

See `.env.example` for all configuration options.

## Related Repos

- [tribe-protocol](../tribe-protocol) -- Solana programs (Anchor)
- [tribe-sdk](../tribe-sdk) -- TypeScript SDK
- [tribe-indexer](../tribe-indexer) -- Event indexer + read API

## License

MIT
