import { Badge } from "@workspace/ui/components/shadcn/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/shadcn/card";
import { getAllRegistryItems } from "@workspace/ui-ds/lib/registry";
import { ArrowRight, Component, Layers } from "lucide-react";
import Link from "next/link";

export default async function DesignSystemIndex() {
  const [components, blocks] = await Promise.all([
    getAllRegistryItems(["registry:ui"]),
    getAllRegistryItems(["registry:block"]),
  ]);

  const allItems = [
    ...components.map((item) => ({ ...item, type: "component" as const })),
    ...blocks.map((item) => ({ ...item, type: "block" as const })),
  ];

  return (
    <div className="container mx-auto space-y-8 p-6">
      <div className="space-y-4">
        <h1 className="font-bold text-4xl tracking-tight">Design System</h1>
        <p className="text-lg text-muted-foreground">
          A collection of reusable components and blocks built using Radix UI
          and Tailwind CSS.
        </p>
      </div>

      {allItems.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">
            No items found in the registry.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {allItems.map((item) => (
            <Link
              href={`/design-system/${item.type}s/${item.name}`}
              key={item.name}
            >
              <Card className="group h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="flex items-center gap-2">
                      {item.type === "component" ? (
                        <Component className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Layers className="h-4 w-4 text-muted-foreground" />
                      )}
                      {item.title || item.name}
                    </CardTitle>
                    <ArrowRight className="h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <CardDescription className="mb-3">
                    {item.description || "No description available."}
                  </CardDescription>
                  <Badge className="w-fit" variant="secondary">
                    {item.type}
                  </Badge>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
