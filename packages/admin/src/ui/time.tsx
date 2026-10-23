import { formatDateTime, toIso } from "../time";

export function Time({
  value,
  showIso = true,
}: {
  value: string | Date | null | undefined;
  showIso?: boolean;
}) {
  const iso = toIso(value);
  return (
    <span title={iso || undefined} className="whitespace-nowrap">
      {formatDateTime(value)}
      {showIso && iso ? (
        <span className="ml-2 font-mono text-[10px] text-faint">{iso.slice(11, 19)}</span>
      ) : null}
    </span>
  );
}
