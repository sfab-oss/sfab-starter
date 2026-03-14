import fs from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default function globalSetup() {
  // Ensure the .auth directory exists for storageState
  const authDir = join(resolve(__dirname, "../.."), "test/.auth");
  fs.mkdirSync(authDir, { recursive: true });
}
