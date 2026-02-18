interface Auth {
  userId: string;
  sessionId: string;
  expiresAt: Date;
}

export interface HonoContext {
  Variables: {
    auth: Auth | null;
  };
}

export type HonoContextWithAuth = HonoContext & {
  Variables: HonoContext["Variables"] & {
    auth: NonNullable<HonoContext["Variables"]["auth"]>;
  };
};
