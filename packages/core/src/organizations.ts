import { db } from "@workspace/db-d1";
import { organization } from "@workspace/db-d1/schema";
import { eq } from "drizzle-orm";

export async function getOrganizationSummary(organizationId: string) {
  const [org] = await db
    .select({
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
    })
    .from(organization)
    .where(eq(organization.id, organizationId))
    .limit(1);

  return org ?? null;
}
