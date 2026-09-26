import { HeadContent, Link, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import css from "../index.css?url";
export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width,initial-scale=1" },
    ],
    links: [{ rel: "stylesheet", href: css }],
  }),
  component: () => (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <div className="shell">
          <nav className="nav">
            <strong>Admin</strong>
            <Link to="/">Overview</Link>
            <Link to="/users">Users</Link>
            <Link to="/payments">Payments</Link>
            <Link to="/audit">Audit</Link>
            <Link to="/blog">Blog</Link>
          </nav>
          <Outlet />
        </div>
        <Scripts />
      </body>
    </html>
  ),
});
