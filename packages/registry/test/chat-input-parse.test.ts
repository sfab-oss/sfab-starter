import {
  type BaseMentionItem,
  type MentionConfigs,
  parseEditorContent,
} from "@workspace/ui/components/ai-elements/chat-input-mentions";
import { describe, expect, it } from "vitest";

type JSONContent = Parameters<typeof parseEditorContent>[0];

// The component's overloads restore the per-key types at the call site; the
// raw parse is untyped, so mirror the cast the component performs.
const parse = (
  ...args: Parameters<typeof parseEditorContent>
): { text: string; member?: BaseMentionItem[]; command?: BaseMentionItem[] } =>
  parseEditorContent(...args);

const MENTIONS: MentionConfigs = {
  member: { trigger: "@", items: [] },
  command: { trigger: "/", items: [] },
};

function doc(...paragraphs: JSONContent[][]): JSONContent {
  return {
    type: "doc",
    content: paragraphs.map((content) => ({ type: "paragraph", content })),
  };
}

const text = (value: string): JSONContent => ({ type: "text", text: value });
const mention = (key: string, id: string, label: string): JSONContent => ({
  type: `${key}-mention`,
  attrs: { id, label },
});

describe("parseEditorContent", () => {
  it("returns plain text with mentions rendered as trigger+label", () => {
    const parsed = parse(
      doc([text("ask "), mention("member", "u1", "Alice"), text(" please")]),
      MENTIONS,
      {}
    );
    expect(parsed.text).toBe("ask @Alice please");
    expect(parsed.member).toEqual([{ id: "u1", name: "Alice" }]);
  });

  it("buckets each mention type under its own key", () => {
    const parsed = parse(
      doc([
        mention("command", "clear", "clear"),
        text(" "),
        mention("member", "u1", "Alice"),
      ]),
      MENTIONS,
      {}
    );
    expect(parsed.text).toBe("/clear @Alice");
    expect(parsed.command).toEqual([{ id: "clear", name: "clear" }]);
    expect(parsed.member).toEqual([{ id: "u1", name: "Alice" }]);
  });

  it("dedupes repeated mentions of the same item", () => {
    const parsed = parse(
      doc([
        mention("member", "u1", "Alice"),
        text(" and "),
        mention("member", "u1", "Alice"),
      ]),
      MENTIONS,
      {}
    );
    expect(parsed.member).toHaveLength(1);
  });

  it("prefers the full cached item over the node's id/label", () => {
    const cached = { id: "u1", name: "Alice", role: "admin" };
    const parsed = parse(doc([mention("member", "u1", "Alice")]), MENTIONS, {
      member: new Map([["u1", cached]]),
    });
    expect(parsed.member?.[0]).toBe(cached);
  });

  it("joins paragraphs with blank lines and hardBreaks with newlines", () => {
    const parsed = parse(
      {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [text("one"), { type: "hardBreak" }, text("two")],
          },
          { type: "paragraph", content: [text("three")] },
        ],
      },
      MENTIONS,
      {}
    );
    expect(parsed.text).toBe("one\ntwo\n\nthree");
  });

  it("handles an empty document", () => {
    expect(parse({ type: "doc" }, MENTIONS, {})).toEqual({
      text: "",
    });
  });
});
