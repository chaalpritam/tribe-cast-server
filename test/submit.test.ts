import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from "vitest";
import nacl from "tweetnacl";
import crypto from "crypto";
import type { FastifyInstance } from "fastify";

// ── Mocks ── must be declared before any imports that touch the mocked modules

vi.mock("../src/storage/db", () => ({
  db: { query: vi.fn(), on: vi.fn() },
}));

vi.mock("../src/validation/app-key-cache", () => ({
  appKeyCache: { isValid: vi.fn(), clear: vi.fn(), invalidate: vi.fn() },
}));

vi.mock("../src/storage/tweet-store", () => {
  const store = {
    insertTweet: vi.fn(),
    deleteTweet: vi.fn(),
    hashExists: vi.fn(),
    getTweetCountByTid: vi.fn(),
    isStorageLimitReached: vi.fn(),
    getTweetsByTid: vi.fn(),
    getAllTweets: vi.fn(),
    getRecentTweets: vi.fn(),
    getTweetsByChannel: vi.fn(),
    getChannels: vi.fn(),
    getReplies: vi.fn(),
    getReplyCount: vi.fn(),
    searchTweets: vi.fn(),
    getTweetByHash: vi.fn(),
  };
  return { tweetStore: store };
});

vi.mock("../src/storage/reaction-store", () => {
  const store = {
    insertReaction: vi.fn(),
    deleteReaction: vi.fn(),
    getReactionByHash: vi.fn(),
  };
  return { reactionStore: store };
});

// ── Imports (after mocks) ──

import { buildServer } from "../src/server";
import { appKeyCache } from "../src/validation/app-key-cache";
import { tweetStore } from "../src/storage/tweet-store";
import { db } from "../src/storage/db";

// ── Helpers ──

const keyPair = nacl.sign.keyPair();

function buildMessage(overrides: {
  type?: number;
  tid?: string;
  body?: Record<string, unknown>;
  useInvalidSig?: boolean;
}) {
  const type = overrides.type ?? 1;
  const tid = overrides.tid ?? "1";
  const body = overrides.body ?? { text: "Hello Tribe!" };

  const data = {
    type,
    tid,
    timestamp: Math.floor(Date.now() / 1000),
    network: 2,
    body,
  };

  const dataBytes = Buffer.from(JSON.stringify(data));
  const hash = crypto.createHash("sha256").update(dataBytes).digest();

  let signature: Uint8Array;
  if (overrides.useInvalidSig) {
    // Sign with a random key so verification against our signer fails
    const badKey = nacl.sign.keyPair();
    signature = nacl.sign.detached(hash, badKey.secretKey);
  } else {
    signature = nacl.sign.detached(hash, keyPair.secretKey);
  }

  return {
    protocolVersion: 1,
    data,
    hash: Buffer.from(hash).toString("base64"),
    signature: Buffer.from(signature).toString("base64"),
    signer: Buffer.from(keyPair.publicKey).toString("base64"),
  };
}

// ── Test suites ──

let server: FastifyInstance;

beforeAll(async () => {
  server = await buildServer();
  await server.ready();
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.clearAllMocks();

  // Sensible defaults — override in individual tests as needed
  vi.mocked(appKeyCache.isValid).mockResolvedValue(true);
  vi.mocked(tweetStore.hashExists).mockResolvedValue(false);
  vi.mocked(tweetStore.isStorageLimitReached).mockResolvedValue(false);
  vi.mocked(tweetStore.insertTweet).mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Submit message tests
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /v1/submitMessage", () => {
  it("valid tweet submission returns 200 + hash", async () => {
    const msg = buildMessage({});

    const res = await server.inject({
      method: "POST",
      url: "/v1/submitMessage",
      payload: msg,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.hash).toBe(msg.hash);
    expect(tweetStore.insertTweet).toHaveBeenCalledTimes(1);
  });

  it("invalid signature returns 400", async () => {
    const msg = buildMessage({ useInvalidSig: true });

    const res = await server.inject({
      method: "POST",
      url: "/v1/submitMessage",
      payload: msg,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/Invalid signature/i);
  });

  it("invalid app key returns 400", async () => {
    vi.mocked(appKeyCache.isValid).mockResolvedValue(false);

    const msg = buildMessage({});

    const res = await server.inject({
      method: "POST",
      url: "/v1/submitMessage",
      payload: msg,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/not a valid app key/i);
  });

  it("duplicate hash returns 400", async () => {
    vi.mocked(tweetStore.hashExists).mockResolvedValue(true);

    const msg = buildMessage({});

    const res = await server.inject({
      method: "POST",
      url: "/v1/submitMessage",
      payload: msg,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/Duplicate/i);
  });

  it("tweet text over 320 chars returns 400", async () => {
    const longText = "x".repeat(321);
    const msg = buildMessage({ body: { text: longText } });

    const res = await server.inject({
      method: "POST",
      url: "/v1/submitMessage",
      payload: msg,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/exceeds max length/i);
  });

  it("REACTION_ADD submission returns 200", async () => {
    vi.mocked((await import("../src/storage/reaction-store")).reactionStore.insertReaction).mockResolvedValue(undefined);

    const msg = buildMessage({
      type: 3, // REACTION_ADD
      body: { type: 1, target_hash: "dGFyZ2V0aGFzaA==" },
    });

    const res = await server.inject({
      method: "POST",
      url: "/v1/submitMessage",
      payload: msg,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().hash).toBe(msg.hash);
  });

  it("missing target_hash for TWEET_REMOVE returns 400", async () => {
    const msg = buildMessage({
      type: 2, // TWEET_REMOVE
      body: {}, // no target_hash
    });

    const res = await server.inject({
      method: "POST",
      url: "/v1/submitMessage",
      payload: msg,
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/target_hash/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Tweet query tests
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /v1/tweets (global feed)", () => {
  it("returns tweets from store", async () => {
    const fakeTweets = [
      { hash: "abc", tid: "1", text: "hello", timestamp: new Date().toISOString() },
    ];
    vi.mocked(tweetStore.getAllTweets).mockResolvedValue(fakeTweets);

    const res = await server.inject({
      method: "GET",
      url: "/v1/tweets",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.tweets).toEqual(fakeTweets);
    expect(tweetStore.getAllTweets).toHaveBeenCalledWith(20, undefined);
  });
});

describe("GET /v1/tweetsByTid/:tid", () => {
  it("returns tweets for a TID", async () => {
    const fakeTweets = [
      { hash: "abc", tid: "42", text: "tid tweet", timestamp: new Date().toISOString() },
    ];
    vi.mocked(tweetStore.getTweetsByTid).mockResolvedValue(fakeTweets);

    const res = await server.inject({
      method: "GET",
      url: "/v1/tweetsByTid/42",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().tweets).toEqual(fakeTweets);
    expect(tweetStore.getTweetsByTid).toHaveBeenCalledWith("42", 20, undefined);
  });
});

describe("GET /v1/tweet?hash=", () => {
  it("returns single tweet", async () => {
    const fakeTweet = { hash: "abc123", tid: "1", text: "one tweet" };
    vi.mocked(tweetStore.getTweetByHash).mockResolvedValue(fakeTweet);

    const res = await server.inject({
      method: "GET",
      url: "/v1/tweet?hash=abc123",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual(fakeTweet);
  });

  it("returns 404 for missing tweet", async () => {
    vi.mocked(tweetStore.getTweetByHash).mockResolvedValue(null);

    const res = await server.inject({
      method: "GET",
      url: "/v1/tweet?hash=doesnotexist",
    });

    expect(res.statusCode).toBe(404);
    expect(res.json().error).toMatch(/not found/i);
  });
});

describe("GET /v1/search", () => {
  it("returns matching tweets", async () => {
    const fakeTweets = [{ hash: "s1", tid: "1", text: "tribe is great" }];
    vi.mocked(tweetStore.searchTweets).mockResolvedValue(fakeTweets);

    const res = await server.inject({
      method: "GET",
      url: "/v1/search?q=tribe",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.tweets).toEqual(fakeTweets);
    expect(body.query).toBe("tribe");
  });

  it("returns 400 for short query", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/v1/search?q=a",
    });

    expect(res.statusCode).toBe(400);
    expect(res.json().error).toMatch(/at least 2 characters/i);
  });
});

describe("GET /v1/replies", () => {
  it("returns replies for a tweet hash", async () => {
    const fakeReplies = [{ hash: "r1", tid: "1", text: "reply", parent_hash: "abc" }];
    vi.mocked(tweetStore.getReplies).mockResolvedValue(fakeReplies);
    vi.mocked(tweetStore.getReplyCount).mockResolvedValue(1);

    const res = await server.inject({
      method: "GET",
      url: "/v1/replies?hash=abc",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.replies).toEqual(fakeReplies);
    expect(body.count).toBe(1);
  });
});

describe("GET /v1/channels", () => {
  it("returns channel list", async () => {
    const fakeChannels = [
      { channel_id: "general", tweet_count: 10, last_active: new Date().toISOString() },
    ];
    vi.mocked(tweetStore.getChannels).mockResolvedValue(fakeChannels);

    const res = await server.inject({
      method: "GET",
      url: "/v1/channels",
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().channels).toEqual(fakeChannels);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Health check
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /health", () => {
  it("returns { status: 'ok' }", async () => {
    const res = await server.inject({
      method: "GET",
      url: "/health",
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
  });
});
