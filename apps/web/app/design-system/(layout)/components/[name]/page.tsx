import { getAllRegistryItems } from "@workspace/ui-ds/lib/registry";
import { DesignSystemDynamicComponentPage } from "@workspace/ui-ds/pages/dynamic-component-page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";

export const revalidate = false;
export const dynamic = "force-dynamic";

const getCachedRegistryItem = cache(async (name: string) => {
  const items = await getAllRegistryItems(["registry:ui"]);
  return items.find((item) => item.name === name);
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
    const components = await getAllRegistryItems(["registry:ui"]);
    return components.map((item) => ({
      name: item.name,
    }));
  } catch {
    return [];
  }
}

export default async function ComponentPage({
  params,
}: {
  params: Promise<{
    name: string;
  }>;
}) {
  const { name } = await params;
  const item = await getCachedRegistryItem(name);

  if (!item || item.type !== "registry:ui") {
    return notFound();
  }

  return <DesignSystemDynamicComponentPage componentName={name} />;
}
