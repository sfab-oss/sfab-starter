import { env } from "cloudflare:workers";
import { nanoid } from "nanoid";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

function getExtension(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? (parts.pop() as string).toLowerCase() : "bin";
}

export async function uploadFile(file: File): Promise<{ key: string }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(
      `File type "${file.type}" is not allowed. Accepted: ${[...ALLOWED_TYPES].join(", ")}`
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size ${(file.size / 1024 / 1024).toFixed(1)} MB exceeds the 5 MB limit`
    );
  }

  const ext = getExtension(file.name);
  const key = `${nanoid()}.${ext}`;

  await env.R2_BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { originalName: file.name },
  });

  return { key };
}

export async function getFile(key: string) {
  return await env.R2_BUCKET.get(key);
}

export async function deleteFile(key: string): Promise<void> {
  await env.R2_BUCKET.delete(key);
}
