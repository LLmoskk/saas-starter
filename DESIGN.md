# 界面基线

前台使用浅色工具界面，后台保留深色运营界面。共享控件结构、语义角色、可操作尺寸和焦点反馈，各应用只定义自己的主题值。

## 组件

原子组件优先使用 shadcn，统一沉淀到 `packages/ui` 并经 `@shadcn/ui` 导出，前后台共享同一实现。选择顺序：已有 shadcn 组件（先用 props、variant 与 size）→ 使用 shadcn CLI 添加缺失组件 → 基于已有原语组合或扩展 → 仍无法覆盖时才写自定义控件。新增弹窗、下拉与菜单复用原语的键盘、焦点和可访问性行为。

共享包名称为 `@shadcn/ui`，这是本仓库的 workspace 包。组件由 shadcn CLI 的 `base-vega`（Base UI）注册表生成，源码位于 `packages/ui/src/components/`。应用与共享包均已配置 `components.json`，使用子路径导入：

```tsx
import { Button } from "@shadcn/ui/components/button";
import { Card, CardContent } from "@shadcn/ui/components/card";
import { cn } from "@shadcn/ui/lib/utils";
```

新增组件运行 `pnpm dlx shadcn@latest add <name> -c apps/web`；后台使用 `-c apps/admin`。CLI 会按别名将原子组件写入共享包，业务组合留在应用。后台 `@starter/admin/ui` 保留运营布局和业务组合，基础控件转出同一份 shadcn 实现。

- Button 默认 `type="button"`，提交表单显式传 `type="submit"`；移动端常用按钮和输入高度至少 44px。渲染链接时使用 Base UI 的 `render` 并传 `nativeButton={false}`。
- Input、Textarea、NativeSelect 配合可见 label 使用。简单原生表单使用 NativeSelect / NativeSelectOption；自定义下拉使用 Select、SelectTrigger、SelectValue、SelectContent、SelectItem，并通过 Root 的 `items` 提供 value 与标签映射。
- Card 使用 CardHeader / CardContent / CardFooter 组合；页面语义通过外层 main、section 或 article 表达，不传旧的 `as` 属性。
- Dialog 使用 Root、Content、Header、Title 等原语组合，模态、焦点与 Escape 由 Base UI 管理。内容超高时内部滚动；多语言页面关闭按钮由调用方提供翻译后的名称。ConfirmDialog 是基于这些原语的后台业务确认壳。
- 共享工具函数统一转出 `cn` 包，与 CLI 生成组件一致。主题和动效通过共享 `styles.css` 引入，应用只定义自己的主题值。
- 用户操作产生的结果靠近对应操作展示。使用组件状态、详情和弹层承载信息，不添加解释性副标题补救布局。

## 图标

功能图标统一用 `lucide-react`，继承文字颜色；描边随相邻文字字重取值（常规 1.5、中粗 2、粗体 2.5），同一界面只保留一种描边策略。不用 emoji 充当图标。

品牌与供应商标志用 `@iconify/react`，在调用点直接导入：

```tsx
import { Icon } from "@iconify/react";

<Icon icon="logos:google-icon" aria-hidden className="size-4" />;
```

- 图标名的前缀决定图标集：`logos:` 彩色品牌标志，`simple-icons:` 单色品牌标志，`thesvg-color:` 彩色标志，`hugeicons:` 通用图标。
- 不另接图标库，也不手抄品牌 SVG；需要的品牌在 Iconify 中没有时优先找 `simple-icons:`。
- 装饰性图标加 `aria-hidden`；纯图标按钮必须提供可访问名称。
- `@iconify/react` 默认在浏览器里按需从 Iconify 公共 API 拉取图标数据并缓存到 localStorage，首次渲染依赖外网。需要离线或内网可用时，安装对应的 `@iconify-json/<set>` 并在客户端入口调用 `addCollection()` 注册。

## 主题

前台颜色事实源为 `apps/web/src/index.css`，后台为 `apps/admin/src/index.css` 与 admin 基础主题。共享 Tailwind 映射位于 `packages/ui/src/styles.css`。

| 角色                         | 用途                           |
| ---------------------------- | ------------------------------ |
| background / foreground      | 页面与正文                     |
| card / card-foreground       | 卡片表面与内容                 |
| primary / primary-foreground | 主要操作                       |
| secondary、muted、accent     | 次要表面、低优先信息与交互反馈 |
| destructive                  | 失败或危险操作                 |
| border / ring                | 分组边界与键盘焦点             |

业务 JSX 使用语义工具类，如 `bg-card`、`text-foreground`、`border-border`。色值集中在主题，业务组件不使用 Tailwind 调色盘颜色。共享组件默认不规定品牌字体或品牌色。

## 布局与文字

- 前台内容宽度上限 1008px，页面水平留白桌面 24px、移动 16px。卡片内边距桌面 24px、窄屏 16px。
- 标题、正文和控件使用系统字体；前台 H1 随视口在 28–40px 间变化，正文和输入保持可读。后台保持既有紧凑运营排版。
- 标题与正文或控件之间保留间距。窄屏卡片改为单列，表格在自己的容器横向滚动。
- 工具类承担业务布局，确需共享的样式放在 `@layer components`。不定义 `.grid`、`.flex` 等与 Tailwind 同名的全局类。
- 焦点保持可见；动效尊重 prefers-reduced-motion。图标按钮提供可访问名称，错误使用文本与语义状态表达。

## 样式实现

- 业务布局、间距、尺寸、排版、状态与响应式直接使用 Tailwind v4 工具类；颜色使用上面的语义角色。参考页面或设计稿决定视觉目标，实现仍使用本项目组件与工具类，不整套搬入参考页面的 CSS 或组件库。
- 复用控件先使用已有 props、variant 与 size；跨页面一致的控件变化沉淀到 `packages/ui`。页面 className 用于组合布局，控件颜色与交互状态由组件 variant 管理；普通内容容器可以直接使用语义颜色工具类。
- CSS 文件承载主题、字体声明、第三方样式适配，以及确实需要集中维护的复杂动效和特效。共享组件样式放在 `@layer components`，主题继续使用现有 Tailwind 层级。普通业务布局留在 JSX，避免另一套页面前缀类体系。
- 新 CSS 文件需在 `scripts/style-policy.json` 中登记精确路径和用途；`pnpm check` 会检查。既有后台与更新提示样式作为兼容例外保留，不代表新页面的默认实现。评审仍需核对主题文件和例外文件有没有混入普通业务样式。
- 新语义 token 根据实际用途补充到应用主题、共享映射与本文件；涉及品牌或产品视觉取舍且需求不明确时再询问用户。图像、画布、用户选色等内容数据与界面主题分开建模。
- 设计调整同步实际主题与本文件；保留当前控件 API 和交互基线，除非本次需求明确要求替换。shadcn 组件的具体底层与 API 以项目实际安装和生成结果为准，引用其他项目示例前先核对真实实现。

## 修改入口

修改主题先改应用 CSS，修改控件行为先改 `packages/ui`，修改运营布局使用 `packages/admin`，页面业务只组合现有原语。保持前台和后台原有流程、默认值与数据含义。
