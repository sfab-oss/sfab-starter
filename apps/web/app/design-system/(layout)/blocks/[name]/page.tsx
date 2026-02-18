import {
  getAllRegistryItems,
  getRegistryItem,
} from "@workspace/ui-ds/lib/registry";
import { DesignSystemBlockPage } from "@workspace/ui-ds/pages/dynamic-blocks-page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

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

  return {
    title: item.title || item.name,
    description: item.description,
  };
}

export async function generateStaticParams() {
  try {
    const blocks = await getAllRegistryItems(["registry:block"]);
    return blocks.map((item) => ({
      name: item.name,
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

  if (!item || item.type !== "registry:block") {
    return notFound();
  }

  return (
    <DesignSystemBlockPage
      description={item.description}
      name={name}
      title={item.title || item.name}
    />
  );
}
