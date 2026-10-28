import { seoHead } from "@/utils/seo";
import { Card } from "@starter/ui";
import { createFileRoute, notFound } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getBlogPost } from "@/functions/blog";
import { getLocale } from "@/paraglide/runtime";
export const Route = createFileRoute("/blog/$slug")({
  loader: async ({ params }) => {
    const post = await getBlogPost({
      data: { slug: params.slug, locale: getLocale() },
    });
    if (!post) throw notFound();
    return post;
  },
  head: ({ loaderData, params }) =>
    seoHead(`/blog/${encodeURIComponent(params.slug)}`, {
      title: loaderData?.seoTitle || loaderData?.title,
      description: loaderData?.seoDescription || loaderData?.excerpt,
      indexable: Boolean(loaderData),
      availableLocales: loaderData?.availableLocales ?? [],
    }),
  component: Post,
});
function Post() {
  const post = Route.useLoaderData();
  return (
    <Card as="article">
      <h1>{post.title}</h1>
      <p className="muted">{post.excerpt}</p>
      {post.coverUrl ? <img src={post.coverUrl} alt="" loading="lazy" decoding="async" /> : null}
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.markdown}</ReactMarkdown>
    </Card>
  );
}
