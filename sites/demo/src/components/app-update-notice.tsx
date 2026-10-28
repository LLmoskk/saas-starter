import { useEffect, useRef, useState } from "react";
import { m } from "@/paraglide/messages";
import { prepareForRefresh, watchAppUpdates } from "@/lib/app-update";
import "./app-update-notice.css";

export function AppUpdateNotice() {
  const [version, setVersion] = useState<string | null>(null);
  const dismissed = useRef<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(
    () =>
      watchAppUpdates((next) => {
        if (next !== dismissed.current) setVersion(next);
      }),
    [],
  );
  if (!version) return null;

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setFailed(false);
    const href = window.location.href;
    try {
      await prepareForRefresh();
      if (window.location.href !== href) throw new Error("Page changed while saving");
      window.location.reload();
    } catch {
      setFailed(true);
      setRefreshing(false);
    }
  };
  return (
    <section className="app-update-notice" aria-label={m["updates.available"]()}>
      <div role="status" aria-live="polite">
        <p className="app-update-title">{m["updates.available"]()}</p>
        {failed && <p className="app-update-error">{m["updates.save_failed"]()}</p>}
      </div>
      <div className="app-update-actions">
        <button
          type="button"
          disabled={refreshing}
          onClick={() => {
            dismissed.current = version;
            setVersion(null);
            setFailed(false);
          }}
        >
          {m["updates.later"]()}
        </button>
        <button
          type="button"
          className="app-update-refresh"
          disabled={refreshing}
          aria-busy={refreshing}
          onClick={() => void refresh()}
        >
          {refreshing ? m["updates.refreshing"]() : m["updates.refresh"]()}
        </button>
      </div>
    </section>
  );
}
