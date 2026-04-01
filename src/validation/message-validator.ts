import nacl from "tweetnacl";
import { SubmitMessageRequest } from "../types";
import { appKeyCache } from "./app-key-cache";

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a submitted message:
 * 1. Verify ed25519 signature
 * 2. Check app key is valid for the FID
 * 3. Check for duplicates (TODO)
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

  // 3. Verify signer is a valid app key for this FID.
  const signerHex = Buffer.from(signer).toString("hex");
  const isValidKey = await appKeyCache.isValid(message.data.fid, signerHex);
  if (!isValidKey) {
    return { valid: false, error: "Signer is not a valid app key for this FID" };
  }

  // 4. TODO: Check for duplicate hash in store.
  // 5. TODO: Check storage limits for FID.

  return { valid: true };
}
