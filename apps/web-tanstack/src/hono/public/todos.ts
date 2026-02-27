import { db, todos } from "@workspace/db-d1";
import { Hono } from "hono";

const app = new Hono();

app.get("/", async (c) => {
  const allTodos = await db.select().from(todos).all();
  return c.json(allTodos);
});

app.post("/", async (c) => {
  const body = await c.req.json<{ text: string }>();
  const result = await db.insert(todos).values({ text: body.text }).returning();
  return c.json(result[0], 201);
});

export { app as todosRoute };
