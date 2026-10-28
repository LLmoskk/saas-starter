import { env } from "@starter/env/web";
import { deLocalizeUrl, getLocale, localizeUrl, locales, type Locale } from "@/paraglide/runtime";
import { m } from "@/paraglide/messages";

export function siteUrl(path: string, locale: Locale = getLocale()) {
  const url = deLocalizeUrl(new URL(path, env.VITE_SITE_URL));
  url.search = "";
  url.hash = "";
  url.pathname = url.pathname.replace(/\/$/, "") || "/";
  return localizeUrl(url, { locale }).href;
}

export function seoHead(
  path: string,
  options: {
    title?: string;
    description?: string;
    indexable?: boolean;
    availableLocales?: readonly string[];
  } = {},
) {
  const indexable = options.indexable !== false && import.meta.env.MODE !== "preview";
  const title = options.title ?? m["site.name"]();
  const description = options.description ?? m["site.description"]();
  const available = locales.filter((locale) =>
    (options.availableLocales ?? locales).includes(locale),
  );
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: indexable ? "index, follow" : "noindex, follow" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: siteUrl(path) },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [
      { rel: "canonical", href: siteUrl(path) },
      ...(indexable
        ? [
            ...available.map((locale) => ({
              rel: "alternate",
              hrefLang: locale,
              href: siteUrl(path, locale),
            })),
            ...(available.includes("en")
              ? [{ rel: "alternate", hrefLang: "x-default", href: siteUrl(path, "en") }]
              : []),
          ]
        : []),
    ],
  };
}
