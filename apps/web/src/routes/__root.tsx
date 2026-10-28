import { seoHead } from "@/utils/seo";
import type { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useLocation,
  useMatches,
} from "@tanstack/react-router";
import { getLocale, localizeHref, locales } from "@/paraglide/runtime";
import { m } from "@/paraglide/messages";
import type { orpc } from "@/utils/orpc";
import { AppUpdateNotice } from "@/components/app-update-notice";
import appCss from "../index.css?url";
type RouterContext = { orpc: typeof orpc; queryClient: QueryClient };
export const Route = createRootRouteWithContext<RouterContext>()({
  head: ({ matches }) => {
    const path = matches.at(-1)?.pathname ?? "/";
    const seo = seoHead(path, { indexable: false });
    return {
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width,initial-scale=1" },
        ...seo.meta,
      ],
      links: [{ rel: "stylesheet", href: appCss }, ...seo.links],
      scripts:
        import.meta.env.PROD && import.meta.env.VITE_GA_MEASUREMENT_ID
          ? [
              {
                src: `https://www.googletagmanager.com/gtag/js?id=${import.meta.env.VITE_GA_MEASUREMENT_ID}`,
                async: true,
              },
              {
                children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${import.meta.env.VITE_GA_MEASUREMENT_ID}')`,
              },
            ]
          : [],
    };
  },
  component: RootDocument,
});

function RootDocument() {
  const location = useLocation();
  const matches = useMatches();
  const post = matches.at(-1)?.loaderData;
  const available =
    post &&
    typeof post === "object" &&
    "availableLocales" in post &&
    Array.isArray(post.availableLocales)
      ? post.availableLocales
      : locales;
  return (
    <html lang={getLocale()}>
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="shell">
          <nav className="nav">
            <strong>{m["site.name"]()}</strong>
            <Link to="/">{m["nav.home"]()}</Link>
            <Link to="/app">{m["nav.app"]()}</Link>
            <Link to="/blog">{m["nav.blog"]()}</Link>
            <Link to="/login">{m["nav.login"]()}</Link>
            <div className="ml-auto flex gap-3" aria-label={m["nav.language"]()}>
              {locales.map((locale) =>
                available.includes(locale) ? (
                  <a
                    key={locale}
                    href={localizeHref(location.href, { locale })}
                    hrefLang={locale}
                    lang={locale}
                    aria-current={getLocale() === locale ? "true" : undefined}
                  >
                    {locale === "en" ? "EN" : "中文"}
                  </a>
                ) : (
                  <span key={locale} aria-disabled="true" className="text-muted-foreground">
                    {locale === "en" ? "EN" : "中文"}
                  </span>
                ),
              )}
            </div>
          </nav>
          <div className="mt-6">
            <Outlet />
          </div>
        </div>
        <AppUpdateNotice />
        <Scripts />
      </body>
    </html>
  );
}
