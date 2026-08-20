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
