import nacl from "tweetnacl";
import { SubmitMessageRequest } from "../types";
import { appKeyCache } from "./app-key-cache";
import { tweetStore } from "../storage/tweet-store";

const MAX_TWEET_TEXT_LENGTH = 320;

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a submitted message:
 * 1. Verify ed25519 signature
 * 2. Check app key is valid for the TID
 * 3. Check for duplicate hash
 * 4. Check storage limits
 * 5. Validate message body
 */
export async function validateMessage(message: SubmitMessageRequest): Promise<ValidationResult> {
  // 1. Decode fields.
  const hash = Buffer.from(message.hash, "base64");
  const signature = Buffer.from(message.signature, "base64");
  const signer = Buffer.from(message.signer, "base64");

  // 2. Verify ed25519 signature over hash.
  const signatureValid = nacl.sign.detached.verify(hash, signature, signer);
  if (!signatureValid) {
    return { valid: false, error: "Invalid signature" };
  }

  // 3. Verify signer is a valid app key for this TID.
  const signerHex = Buffer.from(signer).toString("hex");
  const isValidKey = await appKeyCache.isValid(message.data.tid, signerHex);
  if (!isValidKey) {
    return { valid: false, error: "Signer is not a valid app key for this TID" };
  }

  // 4. Check for duplicate hash.
  const duplicate = await tweetStore.hashExists(message.hash);
  if (duplicate) {
    return { valid: false, error: "Duplicate message hash" };
  }

  // 5. Check storage limits for TWEET_ADD.
  const messageType = message.data.type;
  if (messageType === 1) {
    const limitReached = await tweetStore.isStorageLimitReached(message.data.tid);
    if (limitReached) {
      return { valid: false, error: "Storage limit reached for this TID" };
    }

    // 6. Validate tweet body.
    const body = message.data.body as { text?: string };
    if (!body.text || typeof body.text !== "string") {
      return { valid: false, error: "Tweet text is required" };
    }
    if (body.text.length > MAX_TWEET_TEXT_LENGTH) {
      return { valid: false, error: `Tweet text exceeds max length of ${MAX_TWEET_TEXT_LENGTH} characters` };
    }
  }

  return { valid: true };
}
