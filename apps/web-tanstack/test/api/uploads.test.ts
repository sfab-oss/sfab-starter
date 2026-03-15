import { env, SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestSessionWithOrg } from "../helpers/auth";

let cookie: string;

beforeEach(async () => {
  const session = await createTestSessionWithOrg();
  cookie = session.cookie;
});

const API = "http://localhost/api/protected/inventory/uploads";
const JPG_EXT_PATTERN = /\.jpg$/;

function createTestFile(name: string, type: string, sizeBytes = 100): File {
  const buffer = new Uint8Array(sizeBytes);
  return new File([buffer], name, { type });
}

function uploadRequest(file: File, authCookie: string) {
  const formData = new FormData();
  formData.append("file", file);
  return SELF.fetch(API, {
    method: "POST",
    headers: { Cookie: authCookie },
    body: formData,
  });
}

describe("POST /api/protected/inventory/uploads", () => {
  it("uploads a file and returns a key", async () => {
    const file = createTestFile("photo.jpg", "image/jpeg");
    const res = await uploadRequest(file, cookie);

    expect(res.status).toBe(200);
    const data = (await res.json()) as { key: string };
    expect(data.key).toBeDefined();
    expect(data.key).toMatch(JPG_EXT_PATTERN);
  });

  it("stores the file in R2", async () => {
    const file = createTestFile("photo.png", "image/png", 200);
    const res = await uploadRequest(file, cookie);

    const data = (await res.json()) as { key: string };
    const stored = await env.R2_BUCKET.get(data.key);
    expect(stored).not.toBeNull();
  });

  it("returns 400 when no file is provided", async () => {
    const formData = new FormData();
    const res = await SELF.fetch(API, {
      method: "POST",
      headers: { Cookie: cookie },
      body: formData,
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toBe("No file provided");
  });

  it("returns 400 for disallowed file type", async () => {
    const file = createTestFile("doc.pdf", "application/pdf");
    const res = await uploadRequest(file, cookie);

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain("not allowed");
  });

  it("returns 400 for files exceeding 5 MB", async () => {
    const file = createTestFile("huge.jpg", "image/jpeg", 6 * 1024 * 1024);
    const res = await uploadRequest(file, cookie);

    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain("5 MB");
  });

  it("requires authentication", async () => {
    const file = createTestFile("photo.jpg", "image/jpeg");
    const formData = new FormData();
    formData.append("file", file);
    const res = await SELF.fetch(API, {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(401);
  });
});

describe("GET /api/protected/inventory/uploads/:key", () => {
  it("serves an uploaded file", async () => {
    const file = createTestFile("photo.jpg", "image/jpeg", 150);
    const uploadRes = await uploadRequest(file, cookie);
    const { key } = (await uploadRes.json()) as { key: string };

    const res = await SELF.fetch(`${API}/${key}`, {
      headers: { Cookie: cookie },
    });

    expect(res.status).toBe(200);
    const body = await res.arrayBuffer();
    expect(body.byteLength).toBe(150);
  });

  it("returns correct content type", async () => {
    const file = createTestFile("image.png", "image/png");
    const uploadRes = await uploadRequest(file, cookie);
    const { key } = (await uploadRes.json()) as { key: string };

    const res = await SELF.fetch(`${API}/${key}`, {
      headers: { Cookie: cookie },
    });

    expect(res.headers.get("content-type")).toBe("image/png");
  });

  it("returns cache-control header", async () => {
    const file = createTestFile("image.webp", "image/webp");
    const uploadRes = await uploadRequest(file, cookie);
    const { key } = (await uploadRes.json()) as { key: string };

    const res = await SELF.fetch(`${API}/${key}`, {
      headers: { Cookie: cookie },
    });

    expect(res.headers.get("cache-control")).toBe(
      "public, max-age=31536000, immutable"
    );
  });

  it("returns 404 for non-existent key", async () => {
    const res = await SELF.fetch(`${API}/does-not-exist.jpg`, {
      headers: { Cookie: cookie },
    });

    expect(res.status).toBe(404);
  });

  it("requires authentication", async () => {
    const res = await SELF.fetch(`${API}/any-key.jpg`);
    expect(res.status).toBe(401);
  });
});

describe("DELETE /api/protected/inventory/uploads/:key", () => {
  it("deletes an uploaded file", async () => {
    const file = createTestFile("delete-me.jpg", "image/jpeg");
    const uploadRes = await uploadRequest(file, cookie);
    const { key } = (await uploadRes.json()) as { key: string };

    const deleteRes = await SELF.fetch(`${API}/${key}`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(deleteRes.status).toBe(200);

    // Verify it's gone
    const getRes = await SELF.fetch(`${API}/${key}`, {
      headers: { Cookie: cookie },
    });
    expect(getRes.status).toBe(404);
  });

  it("returns 200 even for non-existent key", async () => {
    const res = await SELF.fetch(`${API}/non-existent.jpg`, {
      method: "DELETE",
      headers: { Cookie: cookie },
    });
    expect(res.status).toBe(200);
  });

  it("requires authentication", async () => {
    const res = await SELF.fetch(`${API}/any-key.jpg`, {
      method: "DELETE",
    });
    expect(res.status).toBe(401);
  });
});
