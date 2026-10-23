# 版本更新提示

Web 每次构建生成新的版本标识，同时写入客户端和静态 `/version.json`。检测在页面加载、窗口获得焦点、标签页恢复可见，以及每 10 分钟执行；隐藏页面不轮询，版本请求不使用缓存。开发模式不轮询。

检测到版本差异或 Vite 懒加载资源失败时，右下角显示“有新版本可用”，用户可以刷新或稍后处理。不会强制刷新。关闭提示后，同一版本在当前组件生命周期内不再提示。Vite 加载错误不调用 `preventDefault()`，保留原始错误供路由处理。

提示使用 `src/components/app-update-notice.css` 和当前主题 CSS 变量。中英文消息在 `messages` 中维护。

## 保存后刷新

需要保存的页面通过 `registerRefreshGuard()` 注册异步前置操作，并在卸载时清理：

```tsx
import { registerRefreshGuard } from "@/lib/app-update";

useEffect(
  () =>
    registerRefreshGuard(async () => {
      await saveDraft();
    }),
  [saveDraft],
);
```

用户点击刷新后会等待所有前置操作完成。任一操作失败则保留页面并展示错误，用户可以重试。若保存过程中页面地址发生变化，也不执行刷新。保存函数须在数据未成功保存或仍有更新未保存时抛错，不能吞掉异常。

模板本身不包含业务编辑器，因此默认不注册保存操作。FilmCraft 在编辑器持久化流程中接入此接口，并检查保存期间是否又有新编辑。
