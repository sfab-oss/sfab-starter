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

const en = readMessages("en");
const lock = readLockfile();
const locales = readdirSync(MESSAGES_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(JSON_EXT, ""))
  .filter((locale) => locale !== "en");

let stubbed = 0;

for (const locale of locales) {
  const target = readMessages(locale);
  let changed = false;

  for (const key of Object.keys(en)) {
    if (!(key in target)) {
      target[key] = "";
      stubbed += 1;
      changed = true;
    }
    const value = target[key];
    if (value && value.trim().length > 0) {
      lock.enHashes[key] = hashEnValue(en[key] ?? "");
    }
  }

  if (changed) {
    writeMessages(locale, target);
  }
}

writeLockfile(lock);

const pathHint = join(MESSAGES_DIR, "{locale}.json");
console.log(
  `i18n:sync ok — ${Object.keys(en).length} EN keys, ${locales.length} target locale(s), ${stubbed} stub(s) written under ${pathHint}`
);
