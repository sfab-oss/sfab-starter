/**
 * Local first-run seed (ALW-332).
 *
 * Inserts a demo user + organization (owner membership + a credential account)
 * into the **local** D1 so a fresh clone can sign in immediately instead of
 * facing an empty database. Idempotent: fixed IDs + `INSERT OR IGNORE` make
 * re-runs a no-op.
 *
 * Runs in plain Node (not the Workers runtime), so it reaches the local D1 via
 * `getPlatformProxy` — the same Miniflare-backed SQLite that `pnpm db:migrate`
 * writes to. It talks to the raw D1 binding with plain SQL rather than Drizzle:
 * the `@workspace/db` client is bound to `cloudflare:workers` (unavailable in
 * Node), and loading Drizzle's schema across the tsx package boundary tripped
 * on mismatched internal module identity. Plain SQL `INSERT OR IGNORE`s don't
 * need an ORM. Password hashing uses better-auth's own `hashPassword` (the same
 * scrypt params its sign-in path verifies against), imported from the env-free
 * `better-auth/crypto` ESM entry.
 *
 * After inserting, it reads the stored hash back and `verifyPassword`s it. A
 * seed can otherwise report success while producing an unsignable login — if
 * better-auth's default hashing ever changes, or (because of `INSERT OR IGNORE`)
 * if a stale account row from an earlier seed survives with a different hash.
 * The self-check turns that silent failure into a loud, seed-time error.
 *
 * NOT for production — see `db:seed` in package.json. There is deliberately no
 * remote/prod seed script.
 */
import { hashPassword, verifyPassword } from "better-auth/crypto";
import { getPlatformProxy } from "wrangler";

// Deterministic IDs → re-running seeds the same rows instead of duplicating.
const DEMO_USER_ID = "seed-user-demo";
const DEMO_ORG_ID = "seed-org-demo";
const DEMO_MEMBER_ID = "seed-member-demo";
const DEMO_ACCOUNT_ID = "seed-account-demo";

const DEMO_EMAIL = "demo@sfab.dev";
const DEMO_PASSWORD = "demo1234";
const DEMO_NAME = "Demo User";
const DEMO_ORG_NAME = "Demo Org";
const DEMO_ORG_SLUG = "demo-org";

const DEMO_ENTITIES = [
  {
    id: "seed-ent-acme",
    name: "Acme Retail",
    type: "customer",
  },
  {
    id: "seed-ent-northwind",
    name: "Northwind Supplies",
    type: "supplier",
  },
  {
    id: "seed-ent-contoso",
    name: "Contoso Cafe",
    type: "customer",
  },
] as const;

const DEMO_PRODUCTS = [
  {
    id: "seed-prod-widget",
    name: "Artisan Widget",
    sku: "WDG-001",
    price: 1999,
    cost: 800,
  },
  {
    id: "seed-prod-mug",
    name: "Ceramic Mug",
    sku: "MUG-100",
    price: 1299,
    cost: 400,
  },
  {
    id: "seed-prod-syrup",
    name: "Espresso Syrup",
    sku: "SYR-ESP",
    price: 899,
    cost: 250,
  },
] as const;

const DEMO_DOCUMENTS = [
  {
    id: "seed-doc-quote-acme",
    type: "quote",
    family: "commercial",
    direction: "sales",
    status: "draft",
    entityId: "seed-ent-acme",
    entityName: "Acme Retail",
    series: "Q",
    folio: 1001,
    total: 5000,
  },
  {
    id: "seed-doc-invoice-contoso",
    type: "invoice",
    family: "fiscal",
    direction: "sales",
    status: "finalized",
    entityId: "seed-ent-contoso",
    entityName: "Contoso Cafe",
    series: "INV",
    folio: 2042,
    total: 12_500,
  },
] as const;

async function main() {
  const { env, dispose } = await getPlatformProxy();
  try {
    const db = (env as { DB: D1Database }).DB;
    const now = Date.now(); // integer timestamp_ms columns
    const nowIso = new Date(now).toISOString();
    const passwordHash = await hashPassword(DEMO_PASSWORD);

    await db.batch([
      db
        .prepare(
          "INSERT OR IGNORE INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(DEMO_USER_ID, DEMO_NAME, DEMO_EMAIL, 1, now, now),
      // The credential account better-auth reads on email/password sign-in:
      // provider_id "credential", account_id = user id, password = scrypt hash.
      db
        .prepare(
          "INSERT OR IGNORE INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(
          DEMO_ACCOUNT_ID,
          DEMO_USER_ID,
          "credential",
          DEMO_USER_ID,
          passwordHash,
          now,
          now
        ),
      db
        .prepare(
          "INSERT OR IGNORE INTO organization (id, name, slug, created_at, updated_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(DEMO_ORG_ID, DEMO_ORG_NAME, DEMO_ORG_SLUG, now, now),
      db
        .prepare(
          "INSERT OR IGNORE INTO member (id, organization_id, user_id, role, created_at) VALUES (?, ?, ?, ?, ?)"
        )
        .bind(DEMO_MEMBER_ID, DEMO_ORG_ID, DEMO_USER_ID, "owner", now),
      ...DEMO_ENTITIES.map((entity) =>
        db
          .prepare(
            "INSERT OR IGNORE INTO entities (id, organization_id, name, type, balance, credit_balance, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 0, ?, ?)"
          )
          .bind(
            entity.id,
            DEMO_ORG_ID,
            entity.name,
            entity.type,
            nowIso,
            nowIso
          )
      ),
      ...DEMO_PRODUCTS.map((product) =>
        db
          .prepare(
            "INSERT OR IGNORE INTO products (id, organization_id, sku, name, price, cost, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            product.id,
            DEMO_ORG_ID,
            product.sku,
            product.name,
            product.price,
            product.cost,
            nowIso,
            nowIso
          )
      ),
      ...DEMO_DOCUMENTS.map((doc) =>
        db
          .prepare(
            "INSERT OR IGNORE INTO documents (id, organization_id, type, family, direction, status, entity_id, entity_name, total, series, folio, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
          )
          .bind(
            doc.id,
            DEMO_ORG_ID,
            doc.type,
            doc.family,
            doc.direction,
            doc.status,
            doc.entityId,
            doc.entityName,
            doc.total,
            doc.series,
            doc.folio,
            nowIso,
            nowIso
          )
      ),
    ]);

    // Self-verify: read the *stored* hash back and confirm it verifies against
    // the demo password. Catches both a better-auth hashing change and a stale
    // account row that `INSERT OR IGNORE` left in place with an older hash.
    const row = await db
      .prepare("SELECT password FROM account WHERE id = ?")
      .bind(DEMO_ACCOUNT_ID)
      .first<{ password: string | null }>();
    const storedHash = row?.password;
    if (!storedHash) {
      throw new Error(
        `verification failed: no credential account row found for ${DEMO_EMAIL}.`
      );
    }
    const verified = await verifyPassword({
      hash: storedHash,
      password: DEMO_PASSWORD,
    });
    if (!verified) {
      throw new Error(
        "verification failed: the stored password hash does not verify against " +
          "the demo password. The account row is likely stale (from an earlier " +
          "seed) or better-auth's password hashing changed. Reseed from scratch " +
          "with `pnpm db:reset && pnpm db:migrate && pnpm db:seed`."
      );
    }

    process.stdout.write(
      `\n✅ Seeded local D1.\n\n   Sign in at http://localhost:4011\n   Email:    ${DEMO_EMAIL}\n   Password: ${DEMO_PASSWORD}\n\n`
    );
  } finally {
    await dispose();
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    process.stderr.write(`\n❌ Seed failed: ${err?.stack ?? err}\n`);
    process.exit(1);
  });
