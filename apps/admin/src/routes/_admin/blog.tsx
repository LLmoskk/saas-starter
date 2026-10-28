import {
  Button,
  Input,
  Page,
  PageHeader,
  Panel,
  Section,
  Select,
  StatusChip,
  Textarea,
} from "@starter/admin/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_admin/blog")({
  component: BlogPage,
});

type BlogForm = {
  id: string | undefined;
  slug: string;
  locale: "en" | "zh-CN";
  title: string;
  excerpt: string;
  markdown: string;
  coverUrl: string;
  seoTitle: string;
  seoDescription: string;
  status: "draft" | "published";
};

const EMPTY_FORM: BlogForm = {
  id: undefined,
  slug: "",
  locale: "en",
  title: "",
  excerpt: "",
  markdown: "",
  coverUrl: "",
  seoTitle: "",
  seoDescription: "",
  status: "draft",
};

function BlogPage() {
  const queryClient = useQueryClient();
  const features = useQuery(orpc.features.queryOptions());
  const posts = useQuery(orpc.blog.list.queryOptions());
  const [form, setForm] = useState<BlogForm>(EMPTY_FORM);

  const save = useMutation(
    orpc.blog.save.mutationOptions({
      onSuccess: (result) => {
        setForm((current) => ({ ...current, id: result.id }));
        toast.success("文章已保存");
        void queryClient.invalidateQueries({ queryKey: orpc.blog.list.key() });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  const upload = useMutation(orpc.blog.uploadUrl.mutationOptions());

  async function uploadImage(file: File) {
    if (file.size > 10 * 1024 * 1024) throw new Error("图片不能超过 10 MB");
    const signed = await upload.mutateAsync({
      contentType: file.type as "image/png" | "image/jpeg" | "image/webp" | "image/avif",
    });
    const response = await fetch(signed.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!response.ok) throw new Error("上传失败");
    setForm((current) => ({
      ...current,
      markdown: `${current.markdown}\n![Image](${signed.publicUrl})\n`,
    }));
  }

  return (
    <Page>
      <PageHeader
        title="博客"
        description="按语言维护文章，保存草稿或直接发布。"
        actions={
          <Button variant="outline" onClick={() => setForm(EMPTY_FORM)}>
            新建文章
          </Button>
        }
      />

      <Panel>
        <div className="border-b border-border px-4 py-2.5">
          <h2 className="admin-label">全部文章 · {posts.data?.length ?? "—"}</h2>
        </div>
        <div className="divide-y divide-border">
          {posts.isError ? (
            <p className="px-4 py-6 text-xs text-destructive">加载失败，请重新登录后重试。</p>
          ) : null}
          {posts.data?.map((post) => (
            <button
              key={post.id}
              type="button"
              onClick={() =>
                setForm({
                  id: post.id,
                  slug: post.slug,
                  locale: post.locale as BlogForm["locale"],
                  title: post.title,
                  excerpt: post.excerpt,
                  markdown: post.markdown,
                  coverUrl: post.coverUrl ?? "",
                  seoTitle: post.seoTitle ?? "",
                  seoDescription: post.seoDescription ?? "",
                  status: post.status as BlogForm["status"],
                })
              }
              className="flex w-full cursor-pointer flex-col gap-1 px-4 py-3 text-left transition-colors hover:bg-raised sm:flex-row sm:items-center sm:justify-between"
            >
              <span className="min-w-0">
                <span className="block truncate font-mono text-xs font-bold text-foreground">
                  {post.title || "未命名"}
                </span>
                <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">
                  {post.locale} · /{post.slug}
                </span>
              </span>
              <StatusChip tone={post.status === "published" ? "ok" : "neutral"}>
                {post.status === "published" ? "已发布" : "草稿"}
              </StatusChip>
            </button>
          ))}
          {posts.data && posts.data.length === 0 ? (
            <p className="px-4 py-10 text-center text-xs text-muted-foreground">还没有文章</p>
          ) : null}
          {!posts.data && !posts.isError ? (
            <p className="px-4 py-10 text-center text-xs text-muted-foreground">加载中…</p>
          ) : null}
        </div>
      </Panel>

      <Section title={form.id ? "编辑文章" : "新建文章"}>
        <form
          className="stack flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate(form);
          }}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="admin-label">标题</span>
              <Input
                value={form.title}
                required
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="admin-label">Slug</span>
              <Input
                value={form.slug}
                required
                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                placeholder="my-first-post"
                onChange={(event) => setForm({ ...form, slug: event.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="admin-label">语言</span>
              <Select
                value={form.locale}
                onChange={(event) =>
                  setForm({ ...form, locale: event.target.value as BlogForm["locale"] })
                }
              >
                <option value="en">English</option>
                <option value="zh-CN">中文</option>
              </Select>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="admin-label">状态</span>
              <Select
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value as BlogForm["status"] })
                }
              >
                <option value="draft">草稿</option>
                <option value="published">已发布</option>
              </Select>
            </label>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="admin-label">摘要</span>
            <Textarea
              value={form.excerpt}
              className="min-h-16"
              onChange={(event) => setForm({ ...form, excerpt: event.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="admin-label">正文（Markdown）</span>
            <Textarea
              value={form.markdown}
              className="min-h-72 font-mono text-xs"
              onChange={(event) => setForm({ ...form, markdown: event.target.value })}
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="admin-label">封面 URL</span>
              <Input
                value={form.coverUrl}
                onChange={(event) => setForm({ ...form, coverUrl: event.target.value })}
              />
            </label>
            {features.data?.storage ? (
              <label className="flex flex-col gap-1.5">
                <span className="admin-label">插入图片</span>
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/avif"
                  className="h-10 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-muted-foreground file:mr-3 file:rounded-sm file:border-0 file:bg-raised file:px-2 file:py-1 file:text-[11px] file:text-foreground"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      await uploadImage(file);
                      toast.success("图片已插入正文");
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : String(error));
                    } finally {
                      event.target.value = "";
                    }
                  }}
                />
              </label>
            ) : null}
            <label className="flex flex-col gap-1.5">
              <span className="admin-label">SEO 标题</span>
              <Input
                value={form.seoTitle}
                onChange={(event) => setForm({ ...form, seoTitle: event.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="admin-label">SEO 描述</span>
              <Input
                value={form.seoDescription}
                onChange={(event) => setForm({ ...form, seoDescription: event.target.value })}
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? "保存中…" : "保存"}
            </Button>
            {form.id ? (
              <span className="font-mono text-[10px] text-muted-foreground">{form.id}</span>
            ) : null}
          </div>
        </form>
      </Section>
    </Page>
  );
}
