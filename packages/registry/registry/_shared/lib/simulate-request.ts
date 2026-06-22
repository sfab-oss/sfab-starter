export async function simulateRequest<T>(value: T, ms = 150): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, ms));
  return value;
}
