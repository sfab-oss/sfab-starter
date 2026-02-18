import { DesignSystemLayout } from "@workspace/ui-ds/components/view/design-system-layout";
import { DesignSystemSidebar } from "@workspace/ui-ds/components/view/design-system-sidebar";
import { getAllRegistryItems } from "@workspace/ui-ds/lib/registry";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";

interface DesignSystemLayoutProps {
  children: React.ReactNode;
}

export default async function DesignSystemLayoutWrapper({
  children,
}: DesignSystemLayoutProps) {
  // Check if design system is enabled
  if (!env.NEXT_PUBLIC_DESIGN_SYSTEM_ENABLED) {
    notFound();
  }

  const [components, blocks] = await Promise.all([
    getAllRegistryItems(["registry:ui"]),
    getAllRegistryItems(["registry:block"]),
  ]);

  return (
    <DesignSystemLayout
      defaultOpen={true}
      sidebar={<DesignSystemSidebar blocks={blocks} components={components} />}
    >
      {children}
    </DesignSystemLayout>
  );
}
