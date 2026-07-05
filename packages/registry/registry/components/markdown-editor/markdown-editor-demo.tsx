"use client";

import { MarkdownEditor } from "@workspace/ui/components/brand/markdown-editor";
import { useState } from "react";

const INITIAL_CONTENT = `# Release notes

Draft the **v2.4** changelog here — this editor speaks *markdown*.

- Bulleted lists
- \`inline code\` and [links](https://example.com)

> Block quotes work too. Press "/" for the slash menu to insert new blocks.
`;

/**
 * The editor is layout-neutral, so the demo supplies the arrangement: a centered
 * \`max-w-3xl\` column, exactly how a document page would host it.
 */
export default function MarkdownEditorDemo() {
  const [value, setValue] = useState(INITIAL_CONTENT);

  return (
    <div className="w-full py-6">
      <div className="mx-auto w-full max-w-3xl">
        <MarkdownEditor onChange={setValue} value={value} />
      </div>
    </div>
  );
}
