# 界面基线

前台使用浅色工具界面，后台保留深色运营界面。共享控件结构、语义角色、可操作尺寸和焦点反馈，各应用只定义自己的主题值。

## 组件

基础控件从 `@starter/ui` 导入：`Button`、`Input`、`Textarea`、`Select`、`Card`、`Dialog`、`ConfirmDialog`。实现位于 `packages/ui/src/`；后台原有 `@starter/admin/ui` 继续转出同一套控件，运营布局组件仍留在 admin 包。

- Button 默认 `type="button"`，提交表单显式传 `type="submit"`。按钮内容通过 flex 居中，窄屏点击区域至少 44px。
- Input、Textarea、Select 配合可见 label 使用。Select 保留浏览器原生键盘行为，选项固定时直接复用它；需要搜索或复杂菜单时再选合适的现成组件。
- Card 只提供表面、边框与内边距。相邻 Card 的间距由父布局的 gap 表达，避免嵌套卡片额外累加 margin。
- Dialog 使用原生 dialog 的模态、焦点管理和 Escape 行为，内容超高时内部滚动；标题与关闭按钮有可访问名称。前台传入当前语言的 closeLabel。
- 用户操作产生的结果靠近对应操作展示。使用已有组件的状态、详情和弹层承载信息，不添加解释性副标题补救布局。

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

## 修改入口

修改主题先改应用 CSS，修改控件行为先改 `packages/ui`，修改运营布局使用 `packages/admin`，页面业务只组合现有原语。保持前台和后台原有流程、默认值与数据含义。
