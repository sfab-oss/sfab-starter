-- Seed data for local development
-- Run: pnpm db:seed (applies to local D1)

INSERT INTO todos (id, text, completed, created_at) VALUES
  ('seed-todo-1', 'Learn TanStack Start', 0, strftime('%s', 'now')),
  ('seed-todo-2', 'Setup Cloudflare D1', 1, strftime('%s', 'now')),
  ('seed-todo-3', 'Build awesome app', 0, strftime('%s', 'now'));
