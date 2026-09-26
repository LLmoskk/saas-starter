import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { orpc } from "@/utils/orpc";
export const Route = createFileRoute("/blog")({ component: Blog });
function Blog() {
  const queryClient = useQueryClient();
  const posts = useQuery(orpc.blog.list.queryOptions());
  const save = useMutation(
    orpc.blog.save.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.blog.list.key() }),
    }),
  );
  const upload = useMutation(orpc.blog.uploadUrl.mutationOptions());
  const [form, setForm] = useState({
    id: undefined as string | undefined,
    slug: "",
    locale: "en" as "en" | "zh-CN",
    title: "",
    excerpt: "",
    markdown: "",
    coverUrl: "",
    seoTitle: "",
    seoDescription: "",
    status: "draft" as "draft" | "published",
  });
  if (posts.isError) return <Link to="/login">Sign in</Link>;
  async function uploadImage(file: File) {
    if (file.size > 10 * 1024 * 1024) throw new Error("Image exceeds 10 MB");
    const signed = await upload.mutateAsync({
      contentType: file.type as "image/png" | "image/jpeg" | "image/webp" | "image/avif",
    });
    const response = await fetch(signed.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) throw new Error("Upload failed");
    setForm((current) => ({
      ...current,
      markdown: current.markdown + `\n![Image](${signed.publicUrl})\n`,
    }));
  }
  return (
    <main>
      <section className="panel">
        <h1>Blog posts</h1>
        {posts.data?.map((post) => (
          <p key={post.id}>
            <button
              onClick={() =>
                setForm({
                  id: post.id,
                  slug: post.slug,
                  locale: post.locale as "en" | "zh-CN",
                  title: post.title,
                  excerpt: post.excerpt,
                  markdown: post.markdown,
                  coverUrl: post.coverUrl ?? "",
                  seoTitle: post.seoTitle ?? "",
                  seoDescription: post.seoDescription ?? "",
                  status: post.status as "draft" | "published",
                })
              }
            >
              {post.title || "Untitled"}
            </button>{" "}
            · {post.status}
          </p>
        ))}
      </section>
      <section className="panel">
        <h2>Editor</h2>
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            const result = await save.mutateAsync(form);
            setForm((current) => ({ ...current, id: result.id }));
          }}
        >
          <label className="field">
            Locale
            <select
              value={form.locale}
              onChange={(e) => setForm({ ...form, locale: e.target.value as "en" | "zh-CN" })}
            >
              <option value="en">English</option>
              <option value="zh-CN">中文</option>
            </select>
          </label>
          {(["slug", "title", "excerpt", "seoTitle", "seoDescription", "coverUrl"] as const).map(
            (key) => (
              <label className="field" key={key}>
                {key}
                <input
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            ),
          )}
          <label className="field">
            Markdown
            <textarea
              value={form.markdown}
              onChange={(e) => setForm({ ...form, markdown: e.target.value })}
            />
          </label>
          <label className="field">
            Image
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file)
                  try {
                    await uploadImage(file);
                  } catch (error) {
                    alert(String(error));
                  }
              }}
            />
          </label>
          <label className="field">
            Status
            <select
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as "draft" | "published" })
              }
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </label>
          <button className="button" disabled={save.isPending}>
            Save
          </button>
          {save.error ? <p className="error">{save.error.message}</p> : null}
        </form>
      </section>
    </main>
  );
}
