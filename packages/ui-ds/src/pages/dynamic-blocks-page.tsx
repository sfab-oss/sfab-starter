import { BlockDisplay } from "@workspace/ui-ds/components/view/block-display";
import {
  DesignSystemLayoutContent,
  DesignSystemLayoutPage,
} from "@workspace/ui-ds/components/view/design-system-layout";

export function DesignSystemBlockPage({
  name,
  title,
  description,
}: {
  name: string;
  title: string;
  description?: string;
}) {
  return (
    <DesignSystemLayoutPage>
      <DesignSystemLayoutContent>
        <div className="container mx-auto space-y-8 p-6">
          <div className="space-y-4">
            <h1 className="scroll-m-20 font-bold text-4xl tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-lg text-muted-foreground">{description}</p>
            )}
          </div>

          <BlockDisplay name={name} />
        </div>
      </DesignSystemLayoutContent>
    </DesignSystemLayoutPage>
  );
}
