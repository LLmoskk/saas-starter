import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

import { Button } from "./button";
import { cn } from "./cn";

function DialogFrame({
  open,
  title,
  description,
  closeLabel,
  pending,
  className,
  onClose,
  footer,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  closeLabel: string;
  pending?: boolean;
  className?: string;
  onClose: () => void;
  footer?: ReactNode;
  children?: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className={cn("ui-dialog", className)}
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div className="ui-dialog-card">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="font-mono text-sm font-bold text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label={closeLabel}
            className="-m-2 flex size-11 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-raised hover:text-foreground md:size-10"
            disabled={pending}
            onClick={onClose}
          >
            <X className="size-4" strokeWidth={1.5} />
          </button>
        </header>
        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? <footer className="mt-5 flex justify-end gap-2">{footer}</footer> : null}
      </div>
    </dialog>
  );
}

/** 原生 `<dialog>` 弹层：自带焦点陷阱、Esc 关闭与 backdrop，无需额外依赖。 */
export function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel = "确认",
  cancelLabel = "取消",
  pending,
  tone = "default",
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  tone?: "default" | "destructive";
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <DialogFrame
      open={open}
      title={title}
      description={description}
      closeLabel={cancelLabel}
      pending={pending}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" disabled={pending} onClick={onClose}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === "destructive" ? "destructive" : "default"}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "处理中…" : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </DialogFrame>
  );
}

/** 通用弹层壳，业务表单可自行组合。 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  className,
  closeLabel = "关闭",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
}) {
  return (
    <DialogFrame
      open={open}
      title={title}
      closeLabel={closeLabel}
      className={className}
      onClose={onClose}
    >
      {children}
    </DialogFrame>
  );
}
