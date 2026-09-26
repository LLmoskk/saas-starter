import { Link, createFileRoute } from "@tanstack/react-router";
import { listBlogPosts } from "@/functions/blog";
import { m } from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
export const Route = createFileRoute("/blog/")({
  loader: () => listBlogPosts(),
  head: () => ({ meta: [{ title: m["blog.title"]() }] }),
  component: Blog,
});
function Blog() {
  const posts = Route.useLoaderData().filter((post) => post.locale === getLocale());
  return (
    <main className="panel">
      <h1>{m["blog.title"]()}</h1>
      {posts.length ? (
        posts.map((post) => (
          <article key={post.id}>
            <h2>
              <Link to="/blog/$slug" params={{ slug: post.slug }}>
                {post.title}
              </Link>
            </h2>
            <p>{post.excerpt}</p>
          </article>
        ))
      ) : (
        <p>{m["blog.empty"]()}</p>
      )}
    </main>
  );
}
