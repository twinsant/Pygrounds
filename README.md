# Pygrounds

Python online playgrounds — 在浏览器中直接编写并运行 Python 代码，无需本地安装。

<img width="1785" alt="image" src="https://user-images.githubusercontent.com/299586/208342791-14186011-215a-43e1-a317-8fe121d63232.png">

## 技术栈

- **Next.js 16** + **React 19** — 前端框架
- **Ant Design 6** — UI 组件库
- **Monaco Editor** — 代码编辑器（VS Code 同款）
- **xterm.js** — 终端模拟器（含 WebGL / Fit / WebLinks 插件）
- **Pyodide** — 浏览器端 Python 运行时（WebAssembly 版 CPython）

## 快速开始

```bash
cd pygrounds-app
bun install
bun dev      # 开发模式，http://localhost:3001
```

生产构建：

```bash
bun build
bun start    # 生产模式，http://localhost:3001
```

## 工作原理

1. 页面加载时通过 `<script>` 标签加载 Pyodide
2. Pyodide 就绪后初始化 Python 环境，终端显示版本信息
3. 用户在左侧 Monaco Editor 编写 Python 代码
4. 点击运行按钮，Pyodide 自动加载导入包并执行代码
5. 输出结果实时显示在右侧 xterm 终端中

## 项目结构

```
Pygrounds/
├── README.md
├── LICENSE
└── pygrounds-app/
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

## License

MIT


