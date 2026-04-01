import { Connection, PublicKey } from "@solana/web3.js";
import { config } from "../config";

interface CachedAppKey {
  fid: string;
  appPubkey: string;
  scope: number;
  revoked: boolean;
  expiresAt: number;
  cachedAt: number;
}

const TTL_MS = 60_000; // 60 second cache TTL

/**
 * In-memory cache of app keys from Solana.
 * Avoids RPC call per message validation.
 */
class AppKeyCache {
  private cache = new Map<string, CachedAppKey>();
  private connection: Connection;

  constructor() {
    this.connection = new Connection(config.solanaRpcUrl);
  }

  /**
   * Check if a signer is a valid (active, non-revoked) app key for an FID.
   */
  async isValid(fid: string, signerHex: string): Promise<boolean> {
    const key = `${fid}:${signerHex}`;
    const cached = this.cache.get(key);

    // Return from cache if fresh.
    if (cached && Date.now() - cached.cachedAt < TTL_MS) {
      return !cached.revoked && (cached.expiresAt === 0 || cached.expiresAt > Date.now() / 1000);
    }

    // Cache miss — fetch from Solana.
    const record = await this.fetchFromChain(fid, signerHex);
    if (!record) return false;

    this.cache.set(key, { ...record, cachedAt: Date.now() });
    return !record.revoked && (record.expiresAt === 0 || record.expiresAt > Date.now() / 1000);
  }

  /**
   * Fetch an app key record from on-chain.
   * TODO: Subscribe to program events for proactive invalidation.
   */
  private async fetchFromChain(fid: string, signerHex: string): Promise<CachedAppKey | null> {
    try {
      const fidBuffer = Buffer.alloc(8);
      fidBuffer.writeBigUInt64LE(BigInt(fid));
      const signerPubkey = new PublicKey(Buffer.from(signerHex, "hex"));

      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("app_key"), fidBuffer, signerPubkey.toBuffer()],
        new PublicKey(config.programIds.appKeyRegistry)
      );

      const accountInfo = await this.connection.getAccountInfo(pda);
      if (!accountInfo) return null;

      // TODO: Deserialize AppKeyRecord from account data using IDL
      // For now, return a placeholder that indicates the key exists
      return {
        fid,
        appPubkey: signerHex,
        scope: 0,
        revoked: false,
        expiresAt: 0,
        cachedAt: Date.now(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Invalidate a specific key (called on revoke events).
   */
  invalidate(fid: string, signerHex: string): void {
    this.cache.delete(`${fid}:${signerHex}`);
  }

  /**
   * Clear entire cache.
   */
  clear(): void {
    this.cache.clear();
  }
}

export const appKeyCache = new AppKeyCache();
