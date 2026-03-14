export function getUploadUrl(key: string): string {
  return `/api/protected/inventory/uploads/${key}`;
}
