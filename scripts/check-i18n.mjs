import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const parameters = (value) =>
  [...new Set([...value.matchAll(/\{([A-Za-z_]\w*)\}/g)].map((match) => match[1]))]
    .sort()
    .join(",");
const errors = [];
for (const site of readdirSync(resolve(root, "sites"), { withFileTypes: true }).filter((item) =>
  item.isDirectory(),
)) {
  const directory = resolve(root, "sites", site.name);
  const settings = JSON.parse(
    readFileSync(resolve(directory, "project.inlang/settings.json"), "utf8"),
  );
  const read = (locale) =>
    JSON.parse(readFileSync(resolve(directory, `messages/${locale}.json`), "utf8"));
  const source = read(settings.baseLocale);
  for (const locale of settings.locales) {
    const messages = read(locale);
    for (const key of new Set([...Object.keys(source), ...Object.keys(messages)])) {
      if (
        typeof source[key] !== "string" ||
        typeof messages[key] !== "string" ||
        !messages[key].trim()
      ) {
        errors.push(`${site.name}/${locale}: ${key} must exist in every locale and contain text`);
      } else if (parameters(source[key]) !== parameters(messages[key])) {
        errors.push(
          `${site.name}/${locale}: ${key} interpolation parameters differ from ${settings.baseLocale}`,
        );
      }
    }
  }
}
if (errors.length) throw new Error(errors.join("\n"));
console.log("Messages checked for all sites");
