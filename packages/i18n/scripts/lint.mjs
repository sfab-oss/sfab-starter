import { readdirSync } from "node:fs";
import {
  extractPlaceholders,
  hashEnValue,
  MESSAGES_DIR,
  readLockfile,
  readMessages,
} from "./lib.mjs";

const JSON_EXT = /\.json$/;
const jsonMode = process.argv.includes("--json");

const en = readMessages("en");
const lock = readLockfile();
const locales = readdirSync(MESSAGES_DIR)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(JSON_EXT, ""))
  .filter((locale) => locale !== "en");

const gaps = [];
const warnings = [];

for (const locale of locales) {
  let target;
  try {
    target = readMessages(locale);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    gaps.push({ locale, key: "*", reason: "missing", detail: message });
    continue;
  }

  for (const [key, enValue] of Object.entries(en)) {
    if (!(key in target)) {
      gaps.push({ locale, key, reason: "missing" });
      continue;
    }
    const value = target[key] ?? "";
    if (value.trim().length === 0) {
      gaps.push({ locale, key, reason: "empty" });
      continue;
    }

    const enPh = extractPlaceholders(enValue);
    const tgPh = extractPlaceholders(value);
    if (enPh.join(",") !== tgPh.join(",")) {
      gaps.push({
        locale,
        key,
        reason: "placeholder_mismatch",
        detail: `en=[${enPh.join(", ")}] ${locale}=[${tgPh.join(", ")}]`,
      });
    }

    const currentHash = hashEnValue(enValue);
    const locked = lock.enHashes[key];
    if (locked && locked !== currentHash) {
      warnings.push({
        locale,
        key,
        reason: "stale_en_hash",
        detail: "EN source changed since last sync/lock — retranslate this key",
      });
    }
  }

  for (const key of Object.keys(target)) {
    if (!(key in en)) {
      warnings.push({ locale, key, reason: "extra_key" });
    }
  }
}

if (jsonMode) {
  console.log(JSON.stringify({ gaps, warnings }, null, 2));
} else if (gaps.length === 0 && warnings.length === 0) {
  console.log(
    `i18n:lint ok — ${Object.keys(en).length} EN keys across ${locales.join(", ")}`
  );
} else {
  if (gaps.length > 0) {
    console.error(`i18n:lint failed — ${gaps.length} hard gap(s):\n`);
    for (const gap of gaps) {
      const detail = gap.detail ? ` (${gap.detail})` : "";
      console.error(`  [${gap.locale}] ${gap.key}: ${gap.reason}${detail}`);
    }
  }
  if (warnings.length > 0) {
    console.warn(`\ni18n:lint warnings — ${warnings.length}:\n`);
    for (const warn of warnings) {
      const detail = warn.detail ? ` (${warn.detail})` : "";
      console.warn(`  [${warn.locale}] ${warn.key}: ${warn.reason}${detail}`);
    }
  }
}

process.exit(gaps.length > 0 ? 1 : 0);
