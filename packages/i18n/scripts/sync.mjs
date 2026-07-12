import { readdirSync } from "node:fs";
import { join } from "node:path";
import {
  hashEnValue,
  MESSAGES_DIR,
  readLockfile,
  readMessages,
  writeLockfile,
  writeMessages,
} from "./lib.mjs";

const JSON_EXT = /\.json$/;

/**
 * Stub-only sync: ensure every EN key exists in each target locale.
 * Does NOT rewrite lock hashes for already-filled targets (that would erase
 * stale_en_hash). Lock hashes are set only when a previously empty target
 * becomes non-empty (first fill after stub), or pruned when EN keys vanish.
 */
const en = readMessages("en");
const lock = readLockfile();
const locales = readdirSync(MESSAGES_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(JSON_EXT, ""))
  .filter((locale) => locale !== "en");

let stubbed = 0;
let newlyLocked = 0;

for (const locale of locales) {
  const target = readMessages(locale);
  let changed = false;

  for (const key of Object.keys(en)) {
    if (!(key in target)) {
      target[key] = "";
      stubbed += 1;
      changed = true;
      continue;
    }

    const value = target[key] ?? "";
    if (value.trim().length > 0 && !(key in lock.enHashes)) {
      // First fill after stub (or lockfile gap) — record EN hash once.
      lock.enHashes[key] = hashEnValue(en[key] ?? "");
      newlyLocked += 1;
    }
  }

  if (changed) {
    writeMessages(locale, target);
  }
}

for (const key of Object.keys(lock.enHashes)) {
  if (!(key in en)) {
    delete lock.enHashes[key];
  }
}

writeLockfile(lock);

const pathHint = join(MESSAGES_DIR, "{locale}.json");
console.log(
  `i18n:sync ok — ${Object.keys(en).length} EN keys, ${locales.length} target locale(s), ${stubbed} stub(s), ${newlyLocked} new lock hash(es) under ${pathHint}`
);
