import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  solanaCluster: process.env.SOLANA_CLUSTER || "devnet",
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  databaseUrl: process.env.DATABASE_URL || "postgresql://tribe:tribe@localhost:5432/tribe_tweets",
  maxTweetsPerTid: parseInt(process.env.MAX_TWEETS_PER_TID || "10000", 10),
  rateLimitTweetsPerMin: parseInt(process.env.RATE_LIMIT_TWEETS_PER_MIN || "30", 10),
  rateLimitReactionsPerMin: parseInt(process.env.RATE_LIMIT_REACTIONS_PER_MIN || "60", 10),
  // Media storage: "disk" (local filesystem) or "ipfs" (requires IPFS_API_URL)
  mediaStorage: (process.env.MEDIA_STORAGE || "disk") as "disk" | "ipfs",
  mediaDir: process.env.MEDIA_DIR || "./data/media",
  ipfsApiUrl: process.env.IPFS_API_URL || "http://localhost:5001",
  ipfsGatewayUrl: process.env.IPFS_GATEWAY_URL || "https://ipfs.io/ipfs",
  programIds: {
    tidRegistry: process.env.TID_REGISTRY_PROGRAM_ID || "4BSmJmRGQWKgioP9DG2bUuRS9U3V6soRauU7Nv6yGvHD",
    appKeyRegistry: process.env.APP_KEY_REGISTRY_PROGRAM_ID || "5LtbFUeAoXWRovGpyWnRJhiCS62XsTYKVErT9kPpv4hN",
  },
};
