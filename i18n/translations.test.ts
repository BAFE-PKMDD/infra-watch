import assert from "node:assert/strict";
import { test } from "bun:test";

import { translations } from "./translations";

type Tree = Record<string, unknown>;

function leaves(tree: Tree, prefix = ""): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [p, v] of leaves(value as Tree, path)) out.set(p, v);
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item && typeof item === "object") for (const [p, v] of leaves(item as Tree, `${path}.${index}`)) out.set(p, v);
        else out.set(`${path}.${index}`, item);
      });
    } else {
      out.set(path, value);
    }
  }
  return out;
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const en = leaves(translations.en as unknown as Tree);
const tl = leaves(translations.tl as unknown as Tree);

test("every English string has a Tagalog string", () => {
  const missing = [...en.keys()].filter((key) => !tl.has(key));
  assert.deepEqual(missing, []);
});

test("Tagalog strings keep the English placeholders", () => {
  const mismatched = [...en.entries()]
    .filter(([key, value]) => typeof value === "string" && typeof tl.get(key) === "string")
    .filter(([key, value]) => placeholders(value as string).join() !== placeholders(tl.get(key) as string).join())
    .map(([key]) => key);
  assert.deepEqual(mismatched, []);
});

test("Tagalog has no keys that English lacks", () => {
  const extra = [...tl.keys()].filter((key) => !en.has(key));
  assert.deepEqual(extra, []);
});
