/**
 * Tamper-evident hash chain helpers — browser-side (Web Crypto).
 */

export type ChainEntry = {
  product_id: string;
  seq: number;
  step_name: string;
  step_data: unknown;
  timestamp: string;
  entry_hash: string;
  previous_entry_hash: string | null;
};

export const GENESIS = "GENESIS";

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function canonicalPayload(input: {
  product_id: string;
  seq: number;
  step_name: string;
  step_data: unknown;
  timestamp: string;
  previous_entry_hash: string | null;
}): string {
  return [
    input.product_id,
    String(input.seq),
    input.step_name,
    stableStringify(input.step_data),
    new Date(input.timestamp).toISOString(),
    input.previous_entry_hash || GENESIS,
  ].join("|");
}

export async function sha256Hex(text: string): Promise<string> {
  // Works in both browser (Web Crypto) and Node.js (crypto module)
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const bytes = new TextEncoder().encode(text);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Node.js fallback
  const { createHash } = await import("crypto");
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

export async function computeEntryHash(input: {
  product_id: string;
  seq: number;
  step_name: string;
  step_data: unknown;
  timestamp: string;
  previous_entry_hash: string | null;
}): Promise<string> {
  return sha256Hex(canonicalPayload(input));
}

export type ChainVerification = {
  valid: boolean;
  brokenAtSeq: number | null;
  finalHash: string | null;
};

/** Recomputes every hash in order and checks the links between entries. */
export async function verifyChain(entries: ChainEntry[]): Promise<ChainVerification> {
  const ordered = [...entries].sort((a, b) => a.seq - b.seq);
  let previous: string | null = null;
  for (const entry of ordered) {
    const expected = await computeEntryHash({
      product_id: entry.product_id,
      seq: entry.seq,
      step_name: entry.step_name,
      step_data: entry.step_data,
      timestamp: entry.timestamp,
      previous_entry_hash: previous,
    });
    const linkOk = (entry.previous_entry_hash || null) === previous;
    if (!linkOk || expected !== entry.entry_hash) {
      return { valid: false, brokenAtSeq: entry.seq, finalHash: null };
    }
    previous = entry.entry_hash;
  }
  return { valid: ordered.length > 0, brokenAtSeq: null, finalHash: previous };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateProductCode(): string {
  let code = "";
  const rand = new Uint8Array(8);
  crypto.getRandomValues(rand);
  for (let i = 0; i < 8; i++) code += ALPHABET[rand[i]! % ALPHABET.length];
  return `TNT-${code.slice(0, 4)}-${code.slice(4)}`;
}

export const PRODUCTION_STEPS = [
  { key: "yarn_sourcing", label: "Yarn sourcing" },
  { key: "dyeing", label: "Dyeing" },
  { key: "weaving", label: "Weaving" },
  { key: "finishing", label: "Finishing" },
] as const;
