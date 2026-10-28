// Isolated check: pnpm exec tsx scripts/check-app-update.ts. No browser, network or database.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { prepareForRefresh, registerRefreshGuard } from "../sites/demo/src/lib/app-update";

const calls: string[] = [];
let removeReplacement: (() => void) | undefined;
const removeFirst = registerRefreshGuard(async () => {
  calls.push("saved");
  // Saving may rerender a consumer and replace its registration mid-flight.
  removeFirst();
  removeReplacement = registerRefreshGuard(async () => {
    calls.push("replacement");
  });
});
const removeFailure = registerRefreshGuard(async () => {
  throw new Error("Save failed");
});
const removeLast = registerRefreshGuard(async () => {
  calls.push("last");
});
try {
  await assert.rejects(prepareForRefresh(), { message: "Save failed" });
  assert.deepEqual(calls, ["saved"], "Failed saves must stop refresh preparation");
  removeFailure();
  await prepareForRefresh();
  assert.deepEqual(calls, ["saved", "last", "replacement"]);
  console.log("App refresh guard check passed.");
} finally {
  removeFirst();
  removeFailure();
  removeLast();
  removeReplacement?.();
}

if (process.argv.includes("--build")) {
  const assets = new URL("../sites/demo/dist/client/", import.meta.url);
  const { version } = JSON.parse(await readFile(new URL("version.json", assets), "utf8"));
  const chunks = await readdir(new URL("assets/", assets));
  const sources = await Promise.all(
    chunks
      .filter((name) => name.endsWith(".js"))
      .map((name) => readFile(new URL(`assets/${name}`, assets), "utf8")),
  );
  assert.ok(
    sources.some((source) => source.includes(version)),
    "Version file must match the client bundle",
  );
  console.log("App build version consistency check passed.");
}
