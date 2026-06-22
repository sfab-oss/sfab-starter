"use client";

import { blocks } from "@workspace/registry";
import { BlockViewer } from "./block-viewer";

/** Gallery order on the blocks index — new blocks append at the end if omitted. */
const BLOCK_ORDER = [
  "today-overview",
  "resource-list-page",
  "record-read-page",
  "record-edit-page",
  "record-payment-dialog",
  "chat-page",
  "command-palette",
  "settings-page",
];

function orderedBlocks() {
  const byName = new Map(blocks.map((block) => [block.name, block]));
  const ordered = BLOCK_ORDER.map((name) => byName.get(name)).filter(
    (block) => block !== undefined
  );
  const rest = blocks.filter((block) => !BLOCK_ORDER.includes(block.name));
  return [...ordered, ...rest];
}

export function BlocksGallery() {
  return (
    <div className="not-prose flex flex-col gap-12">
      {orderedBlocks().map((block) => (
        <section data-slot="blocks-gallery-item" key={block.name}>
          <BlockViewer name={block.name} />
        </section>
      ))}
    </div>
  );
}
