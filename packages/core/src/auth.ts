import type * as schema from "@workspace/db/schema";
import { member } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";

export async function getUserOrganization(
  { userId }: { userId: string },
  db: DrizzleD1Database<typeof schema>
) {
  const membership = await db.query.member.findFirst({
    where: eq(member.userId, userId),
  });

  return membership;
}
