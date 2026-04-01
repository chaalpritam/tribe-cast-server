import { buildServer } from "./server";
import { config } from "./config";

async function main() {
  const server = await buildServer();

  try {
    await server.listen({ port: config.port, host: "0.0.0.0" });
    console.log(`Cast server running on port ${config.port}`);
    console.log(`Solana cluster: ${config.solanaCluster}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
}

main();
