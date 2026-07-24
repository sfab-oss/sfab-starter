import { describe, expect, it } from "vitest";
import {
  humanizeEventType,
  mapActivityRowsToTimeline,
} from "../activity-timeline";

describe("humanizeEventType", () => {
  it("replaces underscores with spaces", () => {
    expect(humanizeEventType("document_finalized")).toBe("document finalized");
  });

  it("falls back when null", () => {
    expect(humanizeEventType(null)).toBe("event");
  });
});

describe("mapActivityRowsToTimeline", () => {
  it("maps activity_log API rows to timeline entries", () => {
    const entries = mapActivityRowsToTimeline([
      {
        id: "act_1",
        eventType: "payment_recorded",
        summary: "Payment of 500.00 recorded",
        createdAt: "2026-06-15T09:10:00.000Z",
        actorId: "user_abc",
      },
      {
        id: "act_2",
        eventType: null,
        summary: null,
        createdAt: "2026-06-10T11:30:00.000Z",
      },
    ]);

    expect(entries).toEqual([
      {
        id: "act_1",
        at: "2026-06-15T09:10:00.000Z",
        field: "payment recorded",
        value: "Payment of 500.00 recorded",
        actor: "user_abc",
      },
      {
        id: "act_2",
        at: "2026-06-10T11:30:00.000Z",
        field: "event",
        value: "event",
      },
    ]);
  });
});
