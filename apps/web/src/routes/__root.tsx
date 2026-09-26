import type { QueryClient } from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
} from "@tanstack/react-router";
import { getLocale } from "@/paraglide/runtime";
import { m } from "@/paraglide/messages";
import type { orpc } from "@/utils/orpc";
import appCss from "../index.css?url";
type RouterContext = { orpc: typeof orpc; queryClient: QueryClient };
export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width,initial-scale=1" },
      { name: "description", content: m["site.description"]() },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
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
  }),
  component: () => (
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
            <a href="/en">EN</a>
            <a href="/zh-CN">中文</a>
          </nav>
          <Outlet />
        </div>
        <Scripts />
      </body>
    </html>
  ),
});
