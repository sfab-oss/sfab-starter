export function getUploadUrl(key: string): string {
  return `/api/protected/catalog/uploads/${key}`;
}
