/**
 * Patches truncated text parts in a response message with complete step texts.
 * When the client disconnects mid-stream, onFinish receives a message with
 * truncated text. This replaces each text part with the corresponding complete
 * step text when the complete version is longer.
 */
export function patchTruncatedTextParts<
  T extends { type: string; text?: string },
>(parts: T[], completeStepTexts: string[]): T[] {
  let stepIndex = 0;
  return parts.map((part) => {
    if (part.type === "text" && stepIndex < completeStepTexts.length) {
      const completeText = completeStepTexts[stepIndex];
      stepIndex++;
      if (completeText && completeText.length > (part.text?.length ?? 0)) {
        return { ...part, text: completeText };
      }
    }
    return part;
  });
}
