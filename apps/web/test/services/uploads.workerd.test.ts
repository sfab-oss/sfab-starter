import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

const JPG_EXT_PATTERN = /\.jpg$/;

function createTestFile(name: string, type: string, sizeBytes = 100): File {
  const buffer = new Uint8Array(sizeBytes);
  return new File([buffer], name, { type });
}

describe("uploadFile", () => {
  it("uploads a valid image and returns a key", async () => {
    const { uploadFile } = await import("@workspace/core/uploads");
    const file = createTestFile("photo.jpg", "image/jpeg");
    const { key } = await uploadFile(file);

    expect(key).toBeDefined();
    expect(key).toMatch(JPG_EXT_PATTERN);

    // Verify file exists in R2
    const stored = await env.R2_BUCKET.get(key);
    expect(stored).not.toBeNull();
  });

  it("preserves content type in R2 metadata", async () => {
    const { uploadFile } = await import("@workspace/core/uploads");
    const file = createTestFile("image.png", "image/png");
    const { key } = await uploadFile(file);

    const stored = await env.R2_BUCKET.get(key);
    expect(stored?.httpMetadata?.contentType).toBe("image/png");
  });

  it("stores original filename in custom metadata", async () => {
    const { uploadFile } = await import("@workspace/core/uploads");
    const file = createTestFile("my-photo.webp", "image/webp");
    const { key } = await uploadFile(file);

    const stored = await env.R2_BUCKET.get(key);
    expect(stored?.customMetadata?.originalName).toBe("my-photo.webp");
  });

  it("rejects disallowed file types", async () => {
    const { uploadFile } = await import("@workspace/core/uploads");
    const file = createTestFile("document.pdf", "application/pdf");

    await expect(uploadFile(file)).rejects.toThrow("not allowed");
  });

  it("rejects files exceeding 5 MB", async () => {
    const { uploadFile } = await import("@workspace/core/uploads");
    const largeFile = createTestFile("huge.jpg", "image/jpeg", 6 * 1024 * 1024);

    await expect(uploadFile(largeFile)).rejects.toThrow("5 MB limit");
  });

  it("accepts all allowed image types", async () => {
    const { uploadFile } = await import("@workspace/core/uploads");

    const types = [
      { name: "a.jpeg", type: "image/jpeg", ext: "jpeg" },
      { name: "b.png", type: "image/png", ext: "png" },
      { name: "c.webp", type: "image/webp", ext: "webp" },
      { name: "d.gif", type: "image/gif", ext: "gif" },
      { name: "e.svg", type: "image/svg+xml", ext: "svg" },
    ];

    for (const { name, type, ext } of types) {
      const file = createTestFile(name, type);
      const { key } = await uploadFile(file);
      expect(key).toMatch(new RegExp(`\\.${ext}$`));
    }
  });

  it("generates unique keys for each upload", async () => {
    const { uploadFile } = await import("@workspace/core/uploads");
    const file1 = createTestFile("photo.jpg", "image/jpeg");
    const file2 = createTestFile("photo.jpg", "image/jpeg");

    const { key: key1 } = await uploadFile(file1);
    const { key: key2 } = await uploadFile(file2);

    expect(key1).not.toBe(key2);
  });
});

describe("getFile", () => {
  it("returns the uploaded file", async () => {
    const { uploadFile, getFile } = await import("@workspace/core/uploads");
    const file = createTestFile("test.png", "image/png", 50);
    const { key } = await uploadFile(file);

    const result = await getFile(key);
    expect(result).not.toBeNull();

    const body = await result?.arrayBuffer();
    expect(body.byteLength).toBe(50);
  });

  it("returns null for non-existent key", async () => {
    const { getFile } = await import("@workspace/core/uploads");
    const result = await getFile("does-not-exist.jpg");
    expect(result).toBeNull();
  });
});

describe("deleteFile", () => {
  it("removes the file from R2", async () => {
    const { uploadFile, getFile, deleteFile } = await import(
      "@workspace/core/uploads"
    );
    const file = createTestFile("delete-me.jpg", "image/jpeg");
    const { key } = await uploadFile(file);

    await deleteFile(key);

    const result = await getFile(key);
    expect(result).toBeNull();
  });

  it("does not throw when deleting non-existent key", async () => {
    const { deleteFile } = await import("@workspace/core/uploads");
    await expect(deleteFile("non-existent.jpg")).resolves.not.toThrow();
  });
});
