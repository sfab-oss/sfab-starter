import type { Auth } from "@workspace/auth";

export interface HonoContext {
  Variables: {
    user: Auth["$Infer"]["Session"]["user"] | null;
    session: Auth["$Infer"]["Session"]["session"] | null;
  };
}

export type HonoContextWithAuth = HonoContext & {
  Variables: HonoContext["Variables"] & {
    user: NonNullable<HonoContext["Variables"]["user"]>;
    session: NonNullable<HonoContext["Variables"]["session"]> & {
      activeOrganizationId: string;
    };
  };
};
