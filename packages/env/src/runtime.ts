export function isWorkersRuntime(): boolean {
  return globalThis.navigator?.userAgent === "Cloudflare-Workers";
}
