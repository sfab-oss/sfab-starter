import { zValidator } from "@hono/zod-validator";
import { deleteFile, getFile, uploadFile } from "@workspace/core/uploads";
import { Hono } from "hono";
import { z } from "zod";
import type { HonoContextWithAuthAndOrg } from "../../types";

const keySchema = z.object({
  key: z.string(),
});

const uploadsRoute = new Hono<HonoContextWithAuthAndOrg>()
  .post("/", async (c) => {
    const body = await c.req.parseBody();
    const file = body.file;

    if (!(file instanceof File)) {
      return c.json({ error: "No file provided" }, 400);
    }

    try {
      const { key } = await uploadFile(file);
      return c.json({ key });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Upload failed";
      return c.json({ error: message }, 400);
    }
  })
  .get("/:key", zValidator("param", keySchema), async (c) => {
    const { key } = c.req.valid("param");
    const object = await getFile(key);

    if (!object) {
      return c.json({ error: "File not found" }, 404);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("cache-control", "public, max-age=31536000, immutable");

    return new Response(object.body, { headers });
  })
  .delete("/:key", zValidator("param", keySchema), async (c) => {
    const { key } = c.req.valid("param");
    await deleteFile(key);
    return c.json({ success: true });
  });

export default uploadsRoute;
