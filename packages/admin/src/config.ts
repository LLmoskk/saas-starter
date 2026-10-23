import type { ReactNode } from "react";

export type AdminNavItem = {
  to: string;
  label: string;
  icon?: ReactNode;
};

export type AdminBrand = {
  name: string;
  /** 侧边栏顶部的小标记文字，通常是品牌首字母。 */
  mark?: string;
  description?: string;
};

export type AdminTheme = "dark" | "light";

export type AdminConfig = {
  brand: AdminBrand;
  theme: AdminTheme;
  nav: AdminNavItem[];
  locale: string;
  timeZone: string;
  login: {
    title: string;
    description: string;
    providerLabel: string;
    footer?: string;
  };
  shell: {
    signOut: string;
    openMenu: string;
    closeMenu: string;
  };
  pager: {
    summary: (total: number, page: number, totalPages: number) => string;
    pageSize: (size: number) => string;
    previous: string;
    next: string;
  };
  auditActions: Record<string, string>;
};

export type AdminConfigInput = Partial<Omit<AdminConfig, "brand" | "login" | "shell" | "pager">> & {
  brand?: Partial<AdminBrand>;
  login?: Partial<AdminConfig["login"]>;
  shell?: Partial<AdminConfig["shell"]>;
  pager?: Partial<AdminConfig["pager"]>;
};

const defaultConfig: AdminConfig = {
  brand: { name: "Admin", mark: "A" },
  theme: "dark",
  nav: [],
  locale: "zh-CN",
  timeZone: "Asia/Shanghai",
  login: {
    title: "运营后台",
    description: "仅限授权管理员使用。请使用授权的账号登录。",
    providerLabel: "使用 Google 登录",
    footer: "白名单之外的账号将被拒绝访问。",
  },
  shell: {
    signOut: "退出登录",
    openMenu: "打开菜单",
    closeMenu: "关闭菜单",
  },
  pager: {
    summary: (total, page, totalPages) => `共 ${total} 条 · 第 ${page} / ${totalPages} 页`,
    pageSize: (size) => `${size} 条/页`,
    previous: "上一页",
    next: "下一页",
  },
  auditActions: {},
};

let current: AdminConfig = defaultConfig;

/** 应用侧覆盖品牌、导航与文案；未提供的字段沿用默认值。 */
export function defineAdminConfig(input: AdminConfigInput): AdminConfig {
  current = {
    ...defaultConfig,
    ...input,
    brand: { ...defaultConfig.brand, ...input.brand },
    login: { ...defaultConfig.login, ...input.login },
    shell: { ...defaultConfig.shell, ...input.shell },
    pager: { ...defaultConfig.pager, ...input.pager },
  };
  return current;
}

export function getAdminConfig(): AdminConfig {
  return current;
}
