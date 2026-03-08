import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import type * as schema from "../schema/auth";
import { member } from "../schema/auth";

export async function getUserOrganization(
  { userId }: { userId: string },
  db: DrizzleD1Database<typeof schema>
) {
  const membership = await db.query.member.findFirst({
    where: eq(member.userId, userId),
  });

  return membership;
}
