/**
 * Domain-level error with a stable code. The HTTP layer maps these to status
 * codes; the core layer stays transport-agnostic.
 */
export type DomainErrorCode = "not_found" | "conflict" | "unprocessable";

export class DomainError extends Error {
  readonly code: DomainErrorCode;

  constructor(message: string, code: DomainErrorCode) {
    super(message);
    this.name = "DomainError";
    this.code = code;
  }
}
