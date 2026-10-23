const refreshGuards = new Set<() => Promise<void>>();

export function registerRefreshGuard(guard: () => Promise<void>) {
  refreshGuards.add(guard);
  return () => {
    refreshGuards.delete(guard);
  };
}

export async function prepareForRefresh() {
  // Snapshot: saving can rerender consumers and replace their registered guard.
  const guards = Array.from(refreshGuards);
  for (const guard of guards) await guard();
}

export function watchAppUpdates(notify: (version: string) => void) {
  let disposed = false;
  let checking = false;
  let controller: AbortController | undefined;
  const check = async () => {
    if (checking || document.visibilityState === "hidden") return;
    checking = true;
    controller = new AbortController();
    try {
      const response = await fetch("/version.json", {
        cache: "no-store",
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
      });
      if (!response.ok) return;
      const payload: unknown = await response.json();
      if (
        !disposed &&
        typeof payload === "object" &&
        payload !== null &&
        "version" in payload &&
        typeof payload.version === "string" &&
        payload.version.length > 0 &&
        payload.version.length <= 128 &&
        payload.version !== import.meta.env.VITE_BUILD_VERSION
      )
        notify(payload.version);
    } catch {
      // Offline or a failed version check must not interrupt editing.
    } finally {
      checking = false;
    }
  };
  const onFocus = () => void check();
  const onChunkError = () => notify("stale-chunk");
  // Never preventDefault: Vite must still reject the failed import, not resolve undefined.
  window.addEventListener("vite:preloadError", onChunkError);
  let timer: ReturnType<typeof setInterval> | undefined;
  if (import.meta.env.PROD) {
    void check();
    timer = setInterval(onFocus, 10 * 60_000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
  }
  return () => {
    disposed = true;
    controller?.abort();
    clearInterval(timer);
    window.removeEventListener("vite:preloadError", onChunkError);
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onFocus);
  };
}
