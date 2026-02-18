import { tool } from "ai";
import { z } from "zod";

// Form field types - union of possible values
const formFieldValueSchema = z.union([z.string(), z.boolean(), z.null()]);

export const createFormTools = () => {
  return {
    "read-form-values": tool({
      description: "Read the current values from the warehouse setup form.",
      inputSchema: z.object({}),
    }),
    "update-form-values": tool({
      description: "Update values in the warehouse setup form.",
      inputSchema: z.object({
        updates: z.record(z.string(), formFieldValueSchema),
      }),
    }),
    "validate-form": tool({
      description: "Validate the warehouse setup form.",
      inputSchema: z.object({}),
    }),
    "submit-form": tool({
      description: "Submit the warehouse setup form to create a new warehouse.",
      inputSchema: z.object({}),
    }),
  };
};
