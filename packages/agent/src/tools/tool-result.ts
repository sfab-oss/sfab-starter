import { DomainError } from "@workspace/core/errors";
import type { JSONValue } from "ai";
import { PERMISSION_DENIED_MESSAGE } from "../constants";

export type ToolErrorCode =
  | "not_found"
  | "conflict"
  | "forbidden"
  | "unprocessable"
  | "unknown";

export interface ToolOk<T> {
  ok: true;
  data: T;
}
export interface ToolErr {
  ok: false;
  error: string;
  code: ToolErrorCode;
}
export type ToolResult<T> = ToolOk<T> | ToolErr;

export function requireFound<T>(
  data: T | null | undefined,
  detail = "Not found"
): T {
  if (data === null || data === undefined) {
    throw new DomainError(detail, "not_found");
  }
  return data;
}

function mapDomainErrorCode(code: DomainError["code"]): ToolErrorCode {
  return code;
}

export async function asToolResult<T>(
  fn: () => T | Promise<T>
): Promise<ToolResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (error) {
    if (error instanceof DomainError) {
      return {
        ok: false,
        error: error.message,
        code: mapDomainErrorCode(error.code),
      };
    }
    if (error instanceof Error) {
      if (error.message === PERMISSION_DENIED_MESSAGE) {
        return {
          ok: false,
          error: error.message,
          code: "forbidden",
        };
      }
      return {
        ok: false,
        error: error.message,
        code: "unknown",
      };
    }
    return {
      ok: false,
      error: "Unknown error",
      code: "unknown",
    };
  }
}

export function toolResultToModelOutput(result: ToolResult<unknown>) {
  if (!result.ok) {
    return { type: "error-text" as const, value: result.error };
  }
  return { type: "json" as const, value: result.data as JSONValue };
}
