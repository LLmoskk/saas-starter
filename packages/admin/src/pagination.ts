import { z } from "zod";

/** Admin 分页统一口径：页大小可选项与默认值。 */
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;
export type PageSizeOption = (typeof PAGE_SIZE_OPTIONS)[number];
export const DEFAULT_PAGE_SIZE: PageSizeOption = 10;

/** URL search 参数里的页大小：非法值 fail-soft 成 undefined，由 resolvePageSize 收敛。 */
export const pageSizeSearchSchema = z.coerce.number().int().optional().catch(undefined);

/** RPC input 里的页大小：类型化调用一般不会传错，仍防手滑。 */
export const pageSizeInputSchema = z.number().int().optional();

export function resolvePageSize(value: number | undefined): PageSizeOption {
  return (PAGE_SIZE_OPTIONS as readonly number[]).includes(value ?? Number.NaN)
    ? (value as PageSizeOption)
    : DEFAULT_PAGE_SIZE;
}

/** 越界页码收敛：总数变少或深链到高页码时回到末页，空集合回到第 1 页。 */
export function clampPage(page: number, total: number, pageSize: number): number {
  const lastPage = Math.max(1, Math.ceil(total / pageSize));
  return Math.min(Math.max(1, page), lastPage);
}

export type PagedList<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * 列表分页的唯一口径：`load` 自己并发取「本页行 + 总数」；请求页越界时
 * 收敛到末页并重取一次，深链或数据变少都不会让运营落到空页。
 */
export async function fetchPaged<T>(
  requestedPage: number,
  pageSize: number,
  load: (page: number) => Promise<{ items: T[]; total: number }>,
): Promise<PagedList<T>> {
  const first = await load(requestedPage);
  const page = clampPage(requestedPage, first.total, pageSize);
  if (page === requestedPage) {
    return { items: first.items, total: first.total, page, pageSize };
  }
  const retry = await load(page);
  return { items: retry.items, total: retry.total, page, pageSize };
}

/** 筛选条件或页大小变化回到第 1 页；显式带 page 时沿用。 */
export function nextPageAfterSearchPatch<T extends object>(
  patch: T & { page?: number },
  currentPage: number,
): number {
  if (patch.page !== undefined) return patch.page;
  const filterTouched = Object.entries(patch).some(
    ([key, value]) => key !== "page" && value !== undefined,
  );
  return filterTouched ? 1 : currentPage;
}
