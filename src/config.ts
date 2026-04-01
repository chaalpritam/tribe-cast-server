import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  solanaCluster: process.env.SOLANA_CLUSTER || "devnet",
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
  databaseUrl: process.env.DATABASE_URL || "postgresql://tribe:tribe@localhost:5432/tribe_casts",
  rateLimitCastsPerMin: parseInt(process.env.RATE_LIMIT_CASTS_PER_MIN || "10", 10),
  rateLimitReactionsPerMin: parseInt(process.env.RATE_LIMIT_REACTIONS_PER_MIN || "60", 10),
  programIds: {
    fidRegistry: process.env.FID_REGISTRY_PROGRAM_ID || "4BSmJmRGQWKgioP9DG2bUuRS9U3V6soRauU7Nv6yGvHD",
    appKeyRegistry: process.env.APP_KEY_REGISTRY_PROGRAM_ID || "5LtbFUeAoXWRovGpyWnRJhiCS62XsTYKVErT9kPpv4hN",
  },
};
