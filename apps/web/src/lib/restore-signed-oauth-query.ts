export function restoreSignedOAuthQuery(rawSearch: string): string {
  const params = new URLSearchParams(rawSearch);
  const baParam = params.get("ba_param");
  if (!baParam?.startsWith("[")) {
    return params.toString();
  }

  let names: unknown;
  try {
    names = JSON.parse(baParam);
  } catch {
    return params.toString();
  }
  if (!Array.isArray(names)) {
    return params.toString();
  }

  params.delete("ba_param");
  for (const name of names) {
    if (typeof name === "string") {
      params.append("ba_param", name);
    }
  }
  return params.toString();
}
