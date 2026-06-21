/**
 * Role-based access control (RBAC) spine — the single `can(action, ctx)` seam.
 *
 * Design (locked with the owner, 2026-06-20; see
 * `docs/architecture/operator-ux.md` §6):
 * - **Role-rank, not a fine-grained matrix.** `owner > admin > operator`. The
 *   rank is expressed by *which actions each role's statement list contains*, so
 *   there is no parallel hand-rolled engine — we configure better-auth's
 *   access-control instead.
 * - **Three fixed tiers.** We reuse better-auth's built-in trio. "operator" is
 *   better-auth's `member` role renamed in **UI copy only** — the stored
 *   `member.role` value stays `"member"` (no migration). See {@link ROLE_LABELS}.
 * - **`dynamicAccessControl` stays OFF** (the plugin default). Orgs assign people
 *   to these fixed roles; they cannot invent roles at runtime.
 * - **Single seam.** Every gate routes through {@link can} so call sites read
 *   `can("payment:reverse", ctx)`, never `role === "admin"`. `can` is built on
 *   the role's network-free `authorize()` so the *same* function works on the
 *   server (Hono/core) and the client (UI show/disable/explain).
 *
 * The `credit:bypass`, `payment:reverse`, and `document:void` actions are
 * defined here but have no live call site yet — they are consumed by the
 * Transaction Core surfaces (ALW-299), which this spine blocks.
 */
import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

/**
 * The access-control statements: better-auth's org defaults
 * (`organization`/`member`/`invitation`/`team`/`ac`) plus this app's
 * business-domain resources.
 */
export const statement = {
  ...defaultStatements,
  /** Catalog / inventory writes (create, update, stock movements). Low-stakes. */
  catalog: ["write"],
  /** Bypass an over-limit fiado sale ("Acepto/Continuar"). Admin+ only. */
  credit: ["bypass"],
  /** Reverse a finalized payment. Admin+ only. */
  payment: ["reverse"],
  /** Void a finalized document. Admin+ only. */
  document: ["void"],
} as const;

export const ac = createAccessControl(statement);

/**
 * **operator** — better-auth's `member` baseline (no org/member writes) plus
 * low-stakes catalog edits. The role key MUST stay `member`: it is the value
 * stored in `member.role`. "operador" is a display label only.
 */
export const member = ac.newRole({
  ...memberAc.statements,
  catalog: ["write"],
});

/** **admin** — member management + org settings + the sensitive money/credit gates. */
export const admin = ac.newRole({
  ...adminAc.statements,
  catalog: ["write"],
  credit: ["bypass"],
  payment: ["reverse"],
  document: ["void"],
});

/** **owner** — everything admin can do, plus org deletion (from `ownerAc`). */
export const owner = ac.newRole({
  ...ownerAc.statements,
  catalog: ["write"],
  credit: ["bypass"],
  payment: ["reverse"],
  document: ["void"],
});

/**
 * The fixed role set, keyed by the value stored in `member.role`. Passed to both
 * the `organization()` server plugin and the `organizationClient()`.
 */
export const roles = { owner, admin, member } as const;

export type RoleName = keyof typeof roles;

/**
 * Named actions → the permission they require. Call sites reference the named
 * action; the resource/verb mapping lives here so it can be swapped without
 * touching call sites.
 */
export const ACTION_PERMISSIONS = {
  /** Create/update products or record stock movements. Operator+ (low-stakes). */
  "catalog:write": { catalog: ["write"] },
  /** Bypass an over-limit fiado sale. Admin+. (Wired by Transaction Core / ALW-299.) */
  "credit:bypass": { credit: ["bypass"] },
  /** Reverse a finalized payment. Admin+. (Wired by Transaction Core / ALW-299.) */
  "payment:reverse": { payment: ["reverse"] },
  /** Void a finalized document. Admin+. (Wired by Transaction Core / ALW-299.) */
  "document:void": { document: ["void"] },
  /** Invite / remove / change a member's role. Admin+. */
  "member:manage": { member: ["create", "update", "delete"] },
  /** Change organization settings. Admin+. */
  "org:settings": { organization: ["update"] },
} as const satisfies Record<
  string,
  Partial<Record<keyof typeof statement, readonly string[]>>
>;

export type Action = keyof typeof ACTION_PERMISSIONS;

/**
 * **The single authorization decision point.** Returns whether `ctx.role` may
 * perform `action`. Network-free and synchronous (uses the role's `authorize()`),
 * so it is safe to call identically on the server and in the UI.
 *
 * @param action a named action from {@link ACTION_PERMISSIONS}
 * @param ctx    the caller's stored role (`member.role`); `null`/unknown → denied
 */
export function can(
  action: Action,
  ctx: { role: string | null | undefined }
): boolean {
  if (!ctx.role) {
    return false;
  }
  const role = roles[ctx.role as RoleName];
  if (!role) {
    return false;
  }
  return role.authorize(ACTION_PERMISSIONS[action]).success;
}

/**
 * Role rank for ordering decisions that are *not* a permission check — e.g.
 * "which roles may this member invite". Higher outranks lower. For yes/no
 * authorization, use {@link can} instead.
 */
export const ROLE_RANK: Record<RoleName, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

/** Returns whether `role` ranks at least as high as `atLeast`. */
export function hasRoleRank(
  role: string | null | undefined,
  atLeast: RoleName
): boolean {
  if (!(role && role in ROLE_RANK)) {
    return false;
  }
  return ROLE_RANK[role as RoleName] >= ROLE_RANK[atLeast];
}

/**
 * User-facing role labels (Spanish). `member` surfaces as "Operador" — the
 * copy-only rename; the stored value remains `member`.
 */
export const ROLE_LABELS: Record<RoleName, string> = {
  owner: "Dueño",
  admin: "Administrador",
  member: "Operador",
};
