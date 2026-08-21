const NOT_FOUND_MESSAGE = /not found/i;

export function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && NOT_FOUND_MESSAGE.test(error.message);
}

export function retryUnlessNotFound(
  failureCount: number,
  error: unknown
): boolean {
  if (isNotFoundError(error)) {
    return false;
  }
  return failureCount < 2;
}
