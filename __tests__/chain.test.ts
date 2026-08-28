/**
 * Unit tests for the tamper-evident hash chain logic.
 * Run: npx jest __tests__/chain.test.ts
 */

import {
  sha256Hex,
  canonicalPayload,
  stableStringify,
  computeEntryHash,
  verifyChain,
  generateProductCode,
  GENESIS,
  type ChainEntry,
} from "@/lib/chain";

// ─── stableStringify ───

describe("stableStringify", () => {
  it("sorts object keys deterministically", () => {
    const a = stableStringify({ z: 1, a: 2, m: 3 });
    const b = stableStringify({ m: 3, a: 2, z: 1 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":2,"m":3,"z":1}');
  });

  it("handles null", () => {
    expect(stableStringify(null)).toBe("null");
  });

  it("handles nested objects", () => {
    const result = stableStringify({ b: { z: 1, a: 2 }, a: [3, 1] });
    expect(result).toBe('{"a":[3,1],"b":{"a":2,"z":1}}');
  });

  it("handles booleans", () => {
    expect(stableStringify(true)).toBe("true");
    expect(stableStringify(false)).toBe("false");
  });

  it("handles strings", () => {
    expect(stableStringify("hello")).toBe('"hello"');
  });
});

// ─── canonicalPayload ───

describe("canonicalPayload", () => {
  it("produces deterministic output", () => {
    const payload = canonicalPayload({
      product_id: "TNT-ABCD-EFGH",
      seq: 1,
      step_name: "yarn_sourcing",
      step_data: { source: "Gujarat" },
      timestamp: "2025-01-15T10:00:00.000Z",
      previous_entry_hash: null,
    });
    expect(typeof payload).toBe("string");
    expect(payload).toContain("TNT-ABCD-EFGH");
    expect(payload).toContain("1");
    expect(payload).toContain("yarn_sourcing");
    expect(payload).toContain(GENESIS);
  });

  it("uses GENESIS when previous_entry_hash is null", () => {
    const payload = canonicalPayload({
      product_id: "TNT-TEST",
      seq: 1,
      step_name: "test",
      step_data: {},
      timestamp: "2025-01-01T00:00:00.000Z",
      previous_entry_hash: null,
    });
    expect(payload).toContain(GENESIS);
  });

  it("includes previous_entry_hash when provided", () => {
    const prevHash = "abc123def456";
    const payload = canonicalPayload({
      product_id: "TNT-TEST",
      seq: 2,
      step_name: "dyeing",
      step_data: {},
      timestamp: "2025-01-02T00:00:00.000Z",
      previous_entry_hash: prevHash,
    });
    expect(payload).toContain(prevHash);
    expect(payload).not.toContain(GENESIS);
  });

  it("normalizes timestamps", () => {
    const payload1 = canonicalPayload({
      product_id: "TNT-TEST",
      seq: 1,
      step_name: "test",
      step_data: {},
      timestamp: "2025-01-15T10:00:00Z",
      previous_entry_hash: null,
    });
    const payload2 = canonicalPayload({
      product_id: "TNT-TEST",
      seq: 1,
      step_name: "test",
      step_data: {},
      timestamp: "2025-01-15T10:00:00.000+00:00",
      previous_entry_hash: null,
    });
    // Both should produce the same ISO string
    expect(payload1).toBe(payload2);
  });
});

// ─── sha256Hex ───

describe("sha256Hex", () => {
  it("produces consistent hashes", async () => {
    const hash1 = await sha256Hex("hello world");
    const hash2 = await sha256Hex("hello world");
    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different inputs", async () => {
    const hash1 = await sha256Hex("hello");
    const hash2 = await sha256Hex("world");
    expect(hash1).not.toBe(hash2);
  });

  it("returns a 64-character hex string", async () => {
    const hash = await sha256Hex("test");
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

// ─── computeEntryHash ───

describe("computeEntryHash", () => {
  it("produces deterministic hashes", async () => {
    const input = {
      product_id: "TNT-ABCD-EFGH",
      seq: 1,
      step_name: "yarn_sourcing",
      step_data: { source: "Gujarat", yarn_type: "Cotton" },
      timestamp: "2025-01-15T10:00:00.000Z",
      previous_entry_hash: null,
    };
    const hash1 = await computeEntryHash(input);
    const hash2 = await computeEntryHash(input);
    expect(hash1).toBe(hash2);
  });

  it("changes when step_name changes", async () => {
    const base = {
      product_id: "TNT-ABCD-EFGH",
      seq: 1,
      step_data: {},
      timestamp: "2025-01-15T10:00:00.000Z",
      previous_entry_hash: null,
    };
    const hash1 = await computeEntryHash({ ...base, step_name: "yarn_sourcing" });
    const hash2 = await computeEntryHash({ ...base, step_name: "dyeing" });
    expect(hash1).not.toBe(hash2);
  });

  it("changes when previous_entry_hash changes", async () => {
    const base = {
      product_id: "TNT-ABCD-EFGH",
      seq: 2,
      step_name: "dyeing",
      step_data: {},
      timestamp: "2025-01-15T10:00:00.000Z",
    };
    const hash1 = await computeEntryHash({ ...base, previous_entry_hash: null });
    const hash2 = await computeEntryHash({ ...base, previous_entry_hash: "abc123" });
    expect(hash1).not.toBe(hash2);
  });
});

// ─── verifyChain ───

describe("verifyChain", () => {
  function makeEntry(
    overrides: Partial<ChainEntry> & { seq: number },
    previousHash: string | null,
  ): ChainEntry & { entry_hash: string; previous_entry_hash: string | null } {
    return {
      product_id: "TNT-TEST-CHAIN",
      step_name: `step_${overrides.seq}`,
      step_data: {},
      timestamp: `2025-01-${String(overrides.seq).padStart(2, "0")}T00:00:00.000Z`,
      entry_hash: "",
      previous_entry_hash: previousHash,
      ...overrides,
    };
  }

  it("validates a correct chain", async () => {
    const entries: ChainEntry[] = [];
    let prevHash: string | null = null;

    for (let seq = 1; seq <= 4; seq++) {
      const entry = makeEntry({ seq }, prevHash);
      entry.entry_hash = await computeEntryHash(entry);
      entries.push(entry);
      prevHash = entry.entry_hash;
    }

    const result = await verifyChain(entries);
    expect(result.valid).toBe(true);
    expect(result.brokenAtSeq).toBeNull();
    expect(result.finalHash).toBe(entries[entries.length - 1].entry_hash);
  });

  it("detects tampered entry_hash", async () => {
    const entries: ChainEntry[] = [];
    let prevHash: string | null = null;

    for (let seq = 1; seq <= 3; seq++) {
      const entry = makeEntry({ seq }, prevHash);
      entry.entry_hash = await computeEntryHash(entry);
      entries.push(entry);
      prevHash = entry.entry_hash;
    }

    // Tamper with entry 2
    entries[1].entry_hash = "tampered_hash";

    const result = await verifyChain(entries);
    expect(result.valid).toBe(false);
    expect(result.brokenAtSeq).toBe(2);
  });

  it("detects broken chain link (wrong previous_entry_hash)", async () => {
    const entries: ChainEntry[] = [];
    let prevHash: string | null = null;

    for (let seq = 1; seq <= 3; seq++) {
      const entry = makeEntry({ seq }, prevHash);
      entry.entry_hash = await computeEntryHash(entry);
      entries.push(entry);
      prevHash = entry.entry_hash;
    }

    // Break the link at entry 3
    entries[2].previous_entry_hash = "wrong_previous_hash";

    const result = await verifyChain(entries);
    expect(result.valid).toBe(false);
    expect(result.brokenAtSeq).toBe(3);
  });

  it("returns false for empty entries", async () => {
    const result = await verifyChain([]);
    expect(result.valid).toBe(false);
  });

  it("handles single entry chain", async () => {
    const entry = makeEntry({ seq: 1 }, null);
    entry.entry_hash = await computeEntryHash(entry);

    const result = await verifyChain([entry]);
    expect(result.valid).toBe(true);
    expect(result.finalHash).toBe(entry.entry_hash);
  });
});

// ─── generateProductCode ───

describe("generateProductCode", () => {
  it("generates TNT-XXXX-XXXX format", () => {
    const code = generateProductCode();
    expect(code).toMatch(/^TNT-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("generates unique codes", () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateProductCode()));
    expect(codes.size).toBe(100);
  });

  it("excludes ambiguous characters (0, O, I, 1)", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateProductCode();
      const chars = code.replace("TNT-", "").replace("-", "");
      expect(chars).not.toMatch(/[0OI1]/);
    }
  });
});
