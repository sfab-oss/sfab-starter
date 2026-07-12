import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const MESSAGES_DIR = join(root, "messages");
export const LOCKFILE_PATH = join(root, ".i18n-lock.json");

export function hashEnValue(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function readLockfile() {
  try {
    const raw = readFileSync(LOCKFILE_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return { enHashes: parsed.enHashes ?? {} };
  } catch {
    return { enHashes: {} };
  }
}

export function writeLockfile(lockfile) {
  writeFileSync(
    LOCKFILE_PATH,
    `${JSON.stringify(lockfile, null, 2)}\n`,
    "utf8"
  );
}

export function readMessages(locale) {
  const path = join(MESSAGES_DIR, `${locale}.json`);
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw);
}

export function writeMessages(locale, messages) {
  const path = join(MESSAGES_DIR, `${locale}.json`);
  const sorted = Object.fromEntries(
    Object.entries(messages).sort(([a], [b]) => a.localeCompare(b))
  );
  writeFileSync(path, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
}

const PLACEHOLDER_RE = /(?<!\{)\{([a-zA-Z_][a-zA-Z0-9_]*)\}(?!\})/g;

export function extractPlaceholders(value) {
  const found = new Set();
  for (const match of value.matchAll(PLACEHOLDER_RE)) {
    const name = match[1];
    if (name) {
      found.add(name);
    }
  }
  return [...found].sort();
}
