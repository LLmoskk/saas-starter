import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

if (!process.env.CI) {
  const root = resolve(import.meta.dirname, "..");
  const repository = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    cwd: root,
    encoding: "utf8",
  });
  if (repository.status === 0 && repository.stdout.trim() === root) {
    const result = spawnSync("git", ["config", "core.hooksPath", ".githooks"], {
      cwd: root,
      stdio: "inherit",
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error("Could not enable pre-commit; run pnpm setup:local");
  }
}
