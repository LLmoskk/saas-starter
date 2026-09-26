import { createFileRoute, notFound } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getBlogPost } from "@/functions/blog";
import { getLocale } from "@/paraglide/runtime";
export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getBlogPost({
      data: { slug: params.slug, locale: getLocale() === "zh-CN" ? "zh-CN" : "en" },
    });
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.seoTitle || loaderData?.title },
      { name: "description", content: loaderData?.seoDescription || loaderData?.excerpt },
    ],
  }),
  component: Post,
});
function Post() {
  const post = Route.useLoaderData();
  return (
    <article className="panel">
      <h1>{post.title}</h1>
      <p className="muted">{post.excerpt}</p>
      {post.coverUrl ? <img src={post.coverUrl} alt="" /> : null}
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.markdown}</ReactMarkdown>
    </article>
  );
}
