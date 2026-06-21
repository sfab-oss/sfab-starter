import {
  type Action,
  can,
  hasRoleRank,
  ROLE_LABELS,
  ROLE_RANK,
} from "@workspace/auth/access-control";
import { describe, expect, it } from "vitest";

const ADMIN_ONLY: Action[] = [
  "credit:bypass",
  "payment:reverse",
  "document:void",
  "member:manage",
  "org:settings",
];
const ALL_ACTIONS: Action[] = ["catalog:write", ...ADMIN_ONLY];

describe("can() — role-rank authorization", () => {
  it("operator (member) may write catalog but nothing sensitive", () => {
    expect(can("catalog:write", { role: "member" })).toBe(true);
    for (const action of ADMIN_ONLY) {
      expect(can(action, { role: "member" })).toBe(false);
    }
  });

  it("admin may perform every v1 action", () => {
    for (const action of ALL_ACTIONS) {
      expect(can(action, { role: "admin" })).toBe(true);
    }
  });

  it("owner may perform every v1 action", () => {
    for (const action of ALL_ACTIONS) {
      expect(can(action, { role: "owner" })).toBe(true);
    }
  });

  it("denies a missing or unknown role", () => {
    for (const action of ALL_ACTIONS) {
      expect(can(action, { role: null })).toBe(false);
      expect(can(action, { role: undefined })).toBe(false);
      expect(can(action, { role: "viewer" })).toBe(false);
    }
  });
});

describe("role rank", () => {
  it("orders owner > admin > operator", () => {
    expect(ROLE_RANK.owner).toBeGreaterThan(ROLE_RANK.admin);
    expect(ROLE_RANK.admin).toBeGreaterThan(ROLE_RANK.member);
  });

  it("hasRoleRank compares against a floor", () => {
    expect(hasRoleRank("owner", "admin")).toBe(true);
    expect(hasRoleRank("admin", "admin")).toBe(true);
    expect(hasRoleRank("member", "admin")).toBe(false);
    expect(hasRoleRank("owner", "owner")).toBe(true);
    expect(hasRoleRank("admin", "owner")).toBe(false);
  });

  it("denies a missing or unknown role", () => {
    expect(hasRoleRank(null, "member")).toBe(false);
    expect(hasRoleRank(undefined, "member")).toBe(false);
    expect(hasRoleRank("viewer", "member")).toBe(false);
  });
});

describe("role labels", () => {
  it("renames member to Operador in UI copy only", () => {
    expect(ROLE_LABELS.member).toBe("Operador");
    expect(ROLE_LABELS.admin).toBe("Administrador");
    expect(ROLE_LABELS.owner).toBe("Dueño");
  });
});
