"""
Unit tests for the hash chain logic used in the seed script.
Verifies Python implementation matches the TypeScript/chain.ts canonical format.

Run: cd backend && python -m unittest tests.test_chain -v
"""

import unittest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from scripts.seed_demo import (
    stable_stringify,
    canonical_payload,
    compute_entry_hash,
    verify_chain,
    generate_product_code,
    GENESIS,
)


class TestStableStringify(unittest.TestCase):
    def test_sorted_keys(self):
        a = stable_stringify({"z": 1, "a": 2, "m": 3})
        b = stable_stringify({"m": 3, "a": 2, "z": 1})
        self.assertEqual(a, b)
        self.assertEqual(a, '{"a":2,"m":3,"z":1}')

    def test_null(self):
        self.assertEqual(stable_stringify(None), "null")

    def test_nested(self):
        result = stable_stringify({"b": {"z": 1, "a": 2}, "a": [3, 1]})
        self.assertEqual(result, '{"a":[3,1],"b":{"a":2,"z":1}}')

    def test_booleans(self):
        self.assertEqual(stable_stringify(True), "true")
        self.assertEqual(stable_stringify(False), "false")

    def test_string(self):
        self.assertEqual(stable_stringify("hello"), '"hello"')


class TestCanonicalPayload(unittest.TestCase):
    def test_deterministic(self):
        p1 = canonical_payload("TNT-X", 1, "yarn_sourcing", {"src": "Gujarat"}, "2025-01-15T10:00:00.000Z", None)
        p2 = canonical_payload("TNT-X", 1, "yarn_sourcing", {"src": "Gujarat"}, "2025-01-15T10:00:00.000Z", None)
        self.assertEqual(p1, p2)
        self.assertIn("TNT-X", p1)
        self.assertIn(GENESIS, p1)

    def test_includes_previous_hash(self):
        prev = "abc123"
        payload = canonical_payload("TNT-X", 2, "dyeing", {}, "2025-01-02T00:00:00Z", prev)
        self.assertIn(prev, payload)
        self.assertNotIn(GENESIS, payload)


class TestComputeEntryHash(unittest.TestCase):
    def test_deterministic(self):
        h1 = compute_entry_hash("TNT-X", 1, "test", {}, "2025-01-01T00:00:00Z", None)
        h2 = compute_entry_hash("TNT-X", 1, "test", {}, "2025-01-01T00:00:00Z", None)
        self.assertEqual(h1, h2)

    def test_64_hex_chars(self):
        h = compute_entry_hash("TNT-X", 1, "test", {}, "2025-01-01T00:00:00Z", None)
        self.assertEqual(len(h), 64)
        self.assertTrue(all(c in "0123456789abcdef" for c in h))

    def test_changes_with_step_name(self):
        h1 = compute_entry_hash("TNT-X", 1, "yarn_sourcing", {}, "2025-01-01T00:00:00Z", None)
        h2 = compute_entry_hash("TNT-X", 1, "dyeing", {}, "2025-01-01T00:00:00Z", None)
        self.assertNotEqual(h1, h2)

    def test_changes_with_previous_hash(self):
        h1 = compute_entry_hash("TNT-X", 2, "dyeing", {}, "2025-01-01T00:00:00Z", None)
        h2 = compute_entry_hash("TNT-X", 2, "dyeing", {}, "2025-01-01T00:00:00Z", "abc123")
        self.assertNotEqual(h1, h2)


class TestVerifyChain(unittest.TestCase):
    def _build_chain(self, steps):
        entries = []
        prev_hash = None
        for i, step_name in enumerate(steps):
            seq = i + 1
            entry = {
                "product_id": "TNT-VERIFY", "seq": seq, "step_name": step_name,
                "step_data": {}, "timestamp": f"2025-01-{seq:02d}T00:00:00.000Z",
                "previous_entry_hash": prev_hash,
            }
            entry["entry_hash"] = compute_entry_hash(
                entry["product_id"], entry["seq"], entry["step_name"],
                entry["step_data"], entry["timestamp"], entry["previous_entry_hash"],
            )
            prev_hash = entry["entry_hash"]
            entries.append(entry)
        return entries

    def test_valid_chain(self):
        entries = self._build_chain(["yarn_sourcing", "dyeing", "weaving", "finishing"])
        result = verify_chain(entries)
        self.assertTrue(result["valid"])
        self.assertIsNone(result["brokenAtSeq"])
        self.assertEqual(result["finalHash"], entries[-1]["entry_hash"])

    def test_tampered_hash(self):
        entries = self._build_chain(["yarn_sourcing", "dyeing", "weaving"])
        entries[1]["entry_hash"] = "tampered"
        result = verify_chain(entries)
        self.assertFalse(result["valid"])
        self.assertEqual(result["brokenAtSeq"], 2)

    def test_broken_link(self):
        entries = self._build_chain(["yarn_sourcing", "dyeing", "weaving"])
        entries[2]["previous_entry_hash"] = "wrong_hash"
        result = verify_chain(entries)
        self.assertFalse(result["valid"])
        self.assertEqual(result["brokenAtSeq"], 3)

    def test_empty_chain(self):
        result = verify_chain([])
        self.assertFalse(result["valid"])

    def test_single_entry(self):
        entries = self._build_chain(["yarn_sourcing"])
        result = verify_chain(entries)
        self.assertTrue(result["valid"])
        self.assertEqual(result["finalHash"], entries[0]["entry_hash"])


class TestGenerateProductCode(unittest.TestCase):
    def test_format(self):
        code = generate_product_code()
        self.assertTrue(code.startswith("TNT-"))
        parts = code.split("-")
        self.assertEqual(len(parts), 3)
        self.assertEqual(len(parts[1]), 4)
        self.assertEqual(len(parts[2]), 4)

    def test_unique(self):
        codes = set(generate_product_code() for _ in range(100))
        self.assertEqual(len(codes), 100)

    def test_no_ambiguous_chars(self):
        for _ in range(50):
            code = generate_product_code()
            chars = code.replace("TNT-", "").replace("-", "")
            for c in chars:
                self.assertNotIn(c, "0OI1")


if __name__ == "__main__":
    unittest.main()
