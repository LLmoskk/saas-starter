import { readdirSync, readFileSync } from "node:fs";
import { basename, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const errors = [];
for (const directory of ["apps", "packages", "sites"]) {
  for (const path of readdirSync(resolve(root, directory), {
    recursive: true,
    withFileTypes: true,
  })) {
    if (!path.isFile()) continue;
    const file = resolve(path.parentPath, path.name);
    if (
      /\/(?:node_modules|paraglide|\.cloudflare|dist|\.output)\//.test(file) ||
      file.endsWith("routeTree.gen.ts")
    )
      continue;
    const source = readFileSync(file, "utf8");
    if (file.includes("/src/routes/") && /\.[cm]?[jt]sx?$/.test(file)) {
      // Router syntax and parameter names are API contracts, not ordinary filenames.
      const name = basename(file)
        .replace(/\$[A-Za-z_]\w*/g, "param")
        .replace(/\[\.\]/g, ".")
        .replace(/^_+/, "");
      if (!/^(?:\$|[a-z0-9]+(?:-[a-z0-9]+)*)(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)*$/.test(name))
        errors.push(`${file}: route filenames use kebab-case outside router syntax`);
    }
    if (
      /\.[jt]sx?$/.test(file) &&
      /\b(?:bg|text|border|ring|fill|stroke|shadow|outline|divide|decoration|accent|caret|from|via|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/.test(
        source,
      )
    ) {
      errors.push(`${file}: use semantic color tokens instead of palette classes`);
    }
    if (
      file.endsWith(".css") &&
      /(?:^|[{}])\s*\.(?:grid|flex|block|hidden|container)\s*[{,]/m.test(source)
    ) {
      errors.push(`${file}: do not redefine Tailwind layout utility classes`);
    }
  }
}
if (errors.length) throw new Error(errors.join("\n"));
console.log("Architecture checked: route filenames, semantic colors and layout classes");
