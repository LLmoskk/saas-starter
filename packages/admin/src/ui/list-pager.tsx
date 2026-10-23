import { ChevronLeft, ChevronRight } from "lucide-react";

import { getAdminConfig } from "../config";
import { PAGE_SIZE_OPTIONS } from "../pagination";
import { Button } from "./button";
import { Select } from "./input";

/**
 * 列表页脚：条数摘要 + 页大小选择 + 上一页/下一页。
 * 页大小变化后重置页码是调用方的职责（通常一并写进 URL search）。
 */
export function ListPager({
  total,
  page,
  pageSize,
  disabled,
  onPageChange,
  onPageSizeChange,
}: {
  total: number;
  page: number;
  pageSize: number;
  disabled?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const { pager } = getAdminConfig();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="font-mono text-[11px] text-muted-foreground">
        {pager.summary(total, page, totalPages)}
      </span>
      <div className="flex items-center gap-2">
        <Select
          value={String(pageSize)}
          aria-label={pager.pageSize(pageSize)}
          className="h-11 w-24 shrink-0 md:h-9"
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {pager.pageSize(size)}
            </option>
          ))}
        </Select>
        <Button
          variant="outline"
          size="icon"
          disabled={page <= 1 || disabled}
          aria-label={pager.previous}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" strokeWidth={1.5} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={page >= totalPages || disabled}
          aria-label={pager.next}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  );
}
