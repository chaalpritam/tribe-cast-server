import { describe, it, expect } from "vitest";

describe("POST /v1/submitMessage", () => {
  it("should reject invalid signature", () => {
    // TODO: Submit message with bad signature, expect 400
    expect(true).toBe(true);
  });

  it("should accept valid message", () => {
    // TODO: Submit properly signed message, expect 200 + hash
    expect(true).toBe(true);
  });

  it("should reject duplicate hash", () => {
    // TODO: Submit same message twice, expect conflict
    expect(true).toBe(true);
  });
});
