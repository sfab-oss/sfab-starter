import { cn } from "@workspace/ui/lib/utils";
import { registryItemSchema } from "@workspace/ui-ds/config/schema";
import {
  getRegistryComponent,
  getRegistryItem,
} from "@workspace/ui-ds/lib/registry";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { z } from "zod";

export const revalidate = false;
export const dynamic = "force-dynamic";

const getCachedRegistryItem = cache(async (name: string) => {
  return await getRegistryItem(name);
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    name: string;
  }>;
}): Promise<Metadata> {
  const { name } = await params;
  const item = await getCachedRegistryItem(name);

  if (!item) {
    return {};
  }

  const description = item.description;

  return {
    title: item.description || item.name,
    description,
  };
}

export async function generateStaticParams() {
  try {
    const { Index } = await import("@workspace/ui-ds/__index__");
    const index = z.record(z.string(), registryItemSchema).parse(Index);

    return Object.values(index)
      .filter((block) =>
        [
          "registry:block",
          "registry:component",
          "registry:example",
          "registry:ui",
        ].includes(block.type)
      )
      .map((block) => ({
        name: block.name,
      }));
  } catch {
    return [];
  }
}

export default async function BlockPage({
  params,
}: {
  params: Promise<{
    name: string;
  }>;
}) {
  const { name } = await params;
  const item = await getCachedRegistryItem(name);
  const Component = getRegistryComponent(name);

  if (!(item && Component)) {
    return notFound();
  }

  return (
    <div className={cn("min-h-screen bg-background", item.meta?.container)}>
      <Component />
    </div>
  );
}
