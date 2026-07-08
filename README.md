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

## 部署到主机 t

仓库新增了一套 Ansible 部署脚本，默认目标主机就是 `t`。

首次部署建议顺序：

```bash
./ops/deploy-systemd.sh
./ops/deploy-from-git.sh
./ops/deploy-nginx.sh
```

说明：

- `deploy-systemd.sh` 会在远端创建 `pygrounds.service`，服务监听 `127.0.0.1:3001`；如果主机上还没有 Bun，会先安装到 `/root/.bun`
- `deploy-from-git.sh` 会在远端 `/root/projects/Pygrounds` 执行 `git fetch`、切分支、`bun install --frozen-lockfile`、`bun run build`，然后重启服务
- `deploy-nginx.sh` 会把 Nginx 反代到 `127.0.0.1:3001`，默认更新远端 `/etc/nginx/conf.d/python.twinsant.com.conf`，`server_name` 也是 `python.twinsant.com`
- Nginx 默认按现网使用 `/etc/nginx/python.twinsant.com_bundle.crt` 和 `/etc/nginx/python.twinsant.com.key`；只有在传 `-e manage_tls_assets=true` 时才会从本地复制证书
- 远端下载代理仅用于 Bun 安装；`deploy-from-git.sh` 里的 `bun install` 按你的要求走远端直连

可选参数示例：

```bash
./ops/deploy-from-git.sh --branch main
./ops/deploy-from-git.sh --repo-url git@github.com:your-org/Pygrounds.git
./ops/deploy-nginx.sh -e manage_tls_assets=true -e ssl_cert_local_path=/path/to/fullchain.crt -e ssl_key_local_path=/path/to/privkey.key
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


