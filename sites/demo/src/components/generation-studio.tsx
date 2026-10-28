import { orpc } from "@/utils/orpc";
import { m } from "@/paraglide/messages";
import { Button, Card, Input, Select, Textarea } from "@starter/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";

export function GenerationStudio() {
  const queryClient = useQueryClient();
  const flows = useQuery(orpc.generation.flows.queryOptions());
  const balance = useQuery(orpc.generation.balance.queryOptions());
  const jobs = useQuery({ ...orpc.generation.list.queryOptions(), refetchInterval: 5_000 });
  const start = useMutation(orpc.generation.start.mutationOptions());
  const cancel = useMutation(orpc.generation.cancel.mutationOptions());
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [selectedFlow, setSelectedFlow] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const requestId = useRef<string | null>(null);
  const uploaded = useRef<{
    file: File;
    reference: { key: string; mime: "image/png" | "image/jpeg" | "image/webp"; size: number };
  } | null>(null);
  const flowId = selectedFlow || flows.data?.[0]?.id || "";
  const flow = flows.data?.find((item) => item.id === flowId);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !flowId || !prompt.trim()) return;
    setUploadError(null);
    setUploading(true);
    try {
      if (uploaded.current?.file !== file) {
        const form = new FormData();
        form.set("file", file);
        const response = await fetch("/api/media/", { method: "POST", body: form });
        if (!response.ok) throw new Error(m["generation.uploadFailed"]());
        uploaded.current = { file, reference: await response.json() };
      }
      const reference = uploaded.current.reference;
      requestId.current ??= crypto.randomUUID();
      await start.mutateAsync({
        idempotencyKey: requestId.current,
        flowId,
        prompt: prompt.trim(),
        references: [{ role: "first_frame", ...reference }],
      });
      requestId.current = null;
      uploaded.current = null;
      setFile(null);
      setPrompt("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orpc.generation.list.key() }),
        queryClient.invalidateQueries({ queryKey: orpc.generation.balance.key() }),
      ]);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : m["generation.failed"]());
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-6">
      <Card as="section">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2>{m["generation.title"]()}</h2>
          <span className="rounded-md bg-secondary px-3 py-2 font-semibold text-secondary-foreground">
            {m["generation.balance"]()}: {balance.data ?? 0}
          </span>
        </div>
        {flows.data?.length ? (
          <form onSubmit={submit} className="grid gap-4">
            {flows.data.length > 1 ? (
              <label className="grid gap-2">
                <span>{m["generation.flow"]()}</span>
                <Select
                  value={flowId}
                  onChange={(event) => {
                    setSelectedFlow(event.target.value);
                    requestId.current = null;
                  }}
                >
                  {flows.data.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}
            <label className="grid gap-2">
              <span>{m["generation.image"]()}</span>
              <Input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                required
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                  requestId.current = null;
                  uploaded.current = null;
                }}
              />
            </label>
            {preview ? (
              <img
                src={preview}
                alt={m["generation.preview"]()}
                className="max-h-80 w-full rounded-md border border-border object-contain"
              />
            ) : null}
            <label className="grid gap-2">
              <span>{m["generation.prompt"]()}</span>
              <Textarea
                value={prompt}
                maxLength={3000}
                required
                onChange={(event) => {
                  setPrompt(event.target.value);
                  requestId.current = null;
                }}
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <strong>
                {flow?.creditCost ?? 0} {m["generation.credits"]()}
              </strong>
              <Button
                type="submit"
                disabled={
                  uploading ||
                  start.isPending ||
                  !file ||
                  !prompt.trim() ||
                  (balance.data ?? 0) < (flow?.creditCost ?? 1)
                }
              >
                {uploading || start.isPending ? m["auth.pending"]() : m["generation.create"]()}
              </Button>
            </div>
            {uploadError ? (
              <p role="alert" className="text-destructive">
                {uploadError}
              </p>
            ) : null}
          </form>
        ) : (
          <p role="status">{m["generation.unavailable"]()}</p>
        )}
      </Card>
      <Card as="section">
        <h2 className="mb-4">{m["generation.history"]()}</h2>
        <div className="grid gap-4">
          {jobs.data?.map((job) => (
            <div key={job.id} className="grid gap-3 rounded-md border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{job.input.prompt}</strong>
                <span role="status">{m[`generation.status.${job.status}`]()}</span>
              </div>
              {job.status === "succeeded" ? (
                <>
                  <video
                    controls
                    src={`/api/media/${job.id}`}
                    className="w-full max-w-xl rounded-md"
                  />
                  <a
                    href={`/api/media/${job.id}?download=1`}
                    className="font-semibold text-primary underline"
                  >
                    {m["generation.download"]()}
                  </a>
                </>
              ) : null}
              {job.status === "failed" && job.error ? (
                <p role="alert" className="text-destructive">
                  {job.error}
                </p>
              ) : null}
              {job.status === "queued" || job.status === "running" ? (
                <Button
                  variant="outline"
                  disabled={cancel.isPending}
                  onClick={async () => {
                    await cancel.mutateAsync({ id: job.id });
                    await Promise.all([
                      queryClient.invalidateQueries({ queryKey: orpc.generation.list.key() }),
                      queryClient.invalidateQueries({ queryKey: orpc.generation.balance.key() }),
                    ]);
                  }}
                >
                  {m["generation.cancel"]()}
                </Button>
              ) : null}
            </div>
          ))}
          {jobs.data?.length === 0 ? <p>{m["generation.empty"]()}</p> : null}
        </div>
      </Card>
    </div>
  );
}
