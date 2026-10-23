import assert from "node:assert/strict";

import { defineAdminConfig, getAdminConfig } from "../src/config.ts";
import {
  clampPage,
  fetchPaged,
  nextPageAfterSearchPatch,
  resolvePageSize,
} from "../src/pagination.ts";

assert.equal(clampPage(5, 42, 10), 5);
assert.equal(clampPage(9, 25, 10), 3);
assert.equal(clampPage(0, 0, 10), 1);

assert.equal(resolvePageSize(20), 20);
assert.equal(resolvePageSize(7), 10);
assert.equal(resolvePageSize(undefined), 10);

assert.equal(nextPageAfterSearchPatch({ q: "ada" }, 3), 1);
assert.equal(nextPageAfterSearchPatch({ page: 4 }, 1), 4);
assert.equal(nextPageAfterSearchPatch({}, 2), 2);

const requestedPages: number[] = [];
const paged = await fetchPaged(9, 10, async (page) => {
  requestedPages.push(page);
  return { items: [page], total: 25 };
});
assert.deepEqual(requestedPages, [9, 3]);
assert.equal(paged.page, 3);
assert.deepEqual(paged.items, [3]);

const config = defineAdminConfig({ brand: { name: "Check" }, theme: "light" });
assert.equal(config.brand.name, "Check");
assert.equal(getAdminConfig().theme, "light");
assert.equal(getAdminConfig().shell.signOut, "退出登录");

console.log("admin logic checks passed");
