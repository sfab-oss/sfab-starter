// Example lib - add your shared utilities here
// Lib files should contain utilities used by services, API, and AI tools

export function formatId(id: string): string {
  return id.trim().toLowerCase();
}

export function parseId(input: string): { valid: boolean; id: string } {
  const cleaned = input.trim();
  return {
    valid: cleaned.length > 0,
    id: cleaned,
  };
}
