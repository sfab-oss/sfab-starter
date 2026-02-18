import { BlockDisplay } from "@workspace/ui-ds/components/view/block-display";
import {
  DesignSystemLayoutContent,
  DesignSystemLayoutPage,
} from "@workspace/ui-ds/components/view/design-system-layout";
import { registryItemExampleSchema } from "@workspace/ui-ds/config/schema";
import { getRegistryItem } from "@workspace/ui-ds/lib/registry";
import { cache } from "react";

export async function DesignSystemDynamicComponentPage({
  componentName,
}: {
  componentName: string;
}) {
  const item = await getCachedRegistryItem(componentName);
  const examples = registryItemExampleSchema
    .array()
    .parse(item?.meta?.examples || []);

  return (
    <DesignSystemLayoutPage>
      <DesignSystemLayoutContent>
        <div className="container mx-auto space-y-12 p-6">
          <div className="space-y-4">
            <h1 className="font-bold text-3xl">
              {item?.title || componentName}
            </h1>
            <p className="text-lg text-muted-foreground">{item?.description}</p>
          </div>

          {examples.map((example) => (
            <section className="space-y-6" key={example.name}>
              <div className="space-y-2">
                <h2 className="font-semibold text-2xl">{example.title}</h2>
                <p className="text-muted-foreground">{example.description}</p>
              </div>
              <BlockDisplay name={example.name} />
            </section>
          ))}
        </div>
      </DesignSystemLayoutContent>
    </DesignSystemLayoutPage>
  );
}

const getCachedRegistryItem = cache(async (name: string) => {
  return await getRegistryItem(name);
});
