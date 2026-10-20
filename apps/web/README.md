# Pygrounds Web

Pygrounds 的前端应用，基于 Next.js 构建。

## 技术栈

- **Next.js 16** + **React 19**
- **Ant Design 6** — UI 组件
- **Monaco Editor** — 代码编辑器
- **xterm.js** — 终端模拟器
- **Pyodide** — 浏览器端 Python 运行时

## 开发

```bash
bun --cwd ../.. install
bun dev      # http://localhost:3001
```

## 构建

```bash
bun build
bun start    # http://localhost:3001
```

## 目录结构

```
apps/web/
├── pages/
│   ├── index.js       # 主页面：编辑器 + 终端 + 运行逻辑
│   ├── _app.js        # 全局应用配置
│   ├── _document.js   # HTML 文档配置
│   └── api/hello.js   # 示例 API 路由
├── components/
│   └── xterm.js       # XTerm 终端组件
├── styles/            # CSS 样式
├── public/            # 静态资源
└── next.config.js     # Next.js 配置
```

## 注册登录

导航右侧的 Ant Design 账户控件使用弹窗登录，不切换页面，游客编辑器继续可用。
`components/AuthProvider.js` 检查服务器会话，`AuthDialog.js` 提供邮箱 / 动态码
两阶段流程，`AccountControl.js` 显示脱敏邮箱和退出入口。没有在 localStorage
保存邮箱、动态码或会话 token；原有本地文件存储不变，也未接入云端同步。

`next.config.js` 仅把 `/api/auth/{start,verify,me,logout}` 转发到已有 twinsant
认证服务。默认 `PYGROUNDS_AUTH_API_ORIGIN=http://127.0.0.1:8000`，本地需启动
对应 FastAPI 服务。该地址在构建时固化，修改后重新构建。后端共享账号数据库、
TOTP issuer 和加密配置；此应用不直接连接数据库。生产 Origin 授权和 nginx
配置要求见仓库根 README 的“网站账号”。

测试：在仓库根目录执行 `bun run test:auth`。
