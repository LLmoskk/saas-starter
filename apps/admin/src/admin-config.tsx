import { defineAdminConfig } from "@starter/admin/config";
import { CreditCard, LayoutDashboard, Newspaper, ScrollText, Users } from "lucide-react";

/**
 * 每个后台自己的品牌、导航与文案。通用套件只认这份配置，
 * 不内置任何业务路由——新增模块在这里追加一项即可。
 */
export const adminConfig = defineAdminConfig({
  brand: { name: "SAAS ADMIN", mark: "S" },
  nav: [
    {
      to: "/",
      label: "总览",
      icon: <LayoutDashboard className="size-4 shrink-0" strokeWidth={1.5} />,
    },
    { to: "/users", label: "用户", icon: <Users className="size-4 shrink-0" strokeWidth={1.5} /> },
    {
      to: "/payments",
      label: "支付",
      icon: <CreditCard className="size-4 shrink-0" strokeWidth={1.5} />,
    },
    {
      to: "/audit",
      label: "审计日志",
      icon: <ScrollText className="size-4 shrink-0" strokeWidth={1.5} />,
    },
    {
      to: "/blog",
      label: "博客",
      icon: <Newspaper className="size-4 shrink-0" strokeWidth={1.5} />,
    },
  ],
  login: {
    title: "运营后台",
    description: "仅限授权管理员使用。请使用 Google 账号独立登录。",
    providerLabel: "使用 Google 登录",
  },
  auditActions: {
    user_disable: "禁用账户",
    user_restore: "恢复账户",
    blog_save: "保存文章",
    blog_publish: "发布文章",
  },
});
