# 界面基线

前台使用浅色工具界面，后台保留深色运营界面。共享控件结构、语义角色、可操作尺寸和焦点反馈，各应用只定义自己的主题值。

## 组件

原子组件优先使用 shadcn，统一沉淀到 `packages/ui` 并经 `@starter/ui` 导出，前后台共享同一实现。选择顺序：已有 shadcn 组件（先用 props、variant 与 size）→ 使用 shadcn CLI 添加缺失组件 → 基于已有原语组合或扩展 → 仍无法覆盖时才写自定义控件。新增弹窗、下拉与菜单复用原语的键盘、焦点和可访问性行为。

模板当前的 `@starter/ui` 是自有实现，尚未完成 shadcn 初始化。首次引入时先配置共享包的 CLI、别名与主题映射，核对生成文件实际位置和导出；不要假设 `components.json`、Base UI 或 Radix 已存在。新增原子能力按 shadcn 路径实现；存量控件保持兼容，在相关任务中逐步迁移，共享 API 变化同步所有调用方，不在业务页面另建平行组件库。

当前基础控件从 `@starter/ui` 导入：`Button`、`Input`、`Textarea`、`Select`、`Card`、`Dialog`、`ConfirmDialog`。实现位于 `packages/ui/src/`；后台原有 `@starter/admin/ui` 继续转出同一套控件，运营布局组件仍留在 admin 包。

以下描述当前兼容实现，迁移时需核对实际组件 API 并保持对应行为：

- Button 默认 `type="button"`，提交表单显式传 `type="submit"`。按钮内容通过 flex 居中，窄屏点击区域至少 44px。
- Input、Textarea、Select 配合可见 label 使用。Select 保留浏览器原生键盘行为，选项固定时直接复用它；需要搜索或复杂菜单时再选合适的现成组件。
- Card 只提供表面、边框与内边距。相邻 Card 的间距由父布局的 gap 表达，避免嵌套卡片额外累加 margin。
- Dialog 使用原生 dialog 的模态、焦点管理和 Escape 行为，内容超高时内部滚动；标题与关闭按钮有可访问名称。前台传入当前语言的 closeLabel。
- 用户操作产生的结果靠近对应操作展示。使用已有组件的状态、详情和弹层承载信息，不添加解释性副标题补救布局。

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
