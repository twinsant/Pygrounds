# Pygrounds

Python online playgrounds — 在浏览器中直接编写并运行 Python 代码，无需本地安装。

<img width="2992" height="1696" alt="c3b85e9236aa025ace65c54a935a980c" src="https://github.com/user-attachments/assets/af44a195-90fe-4ca4-a4b8-0895bb481c72" />


## 技术栈

- **Next.js 16** + **React 19** — 前端框架
- **Ant Design 6** — UI 组件库
- **Monaco Editor** — 代码编辑器（VS Code 同款）
- **xterm.js** — 终端模拟器（含 WebGL / Fit / WebLinks 插件）
- **Pyodide** — 浏览器端 Python 运行时（WebAssembly 版 CPython）

## 项目结构

```text
Pygrounds/
├── apps/
│   ├── web/                       # 在线版 Next.js 应用
│   └── desktop/                   # Tauri 桌面客户端
├── packages/
│   ├── app-ui/                    # 跨平台 React UI 边界
│   ├── python-runtime/            # Pyodide 运行时适配
│   ├── file-storage/              # 浏览器/桌面文件存储适配
│   └── pyodide-assets/            # 统一 Pyodide 版本
└── ops/                           # 在线版部署配置
```

在线版和桌面版共享运行时接口与文件模型，但各自保留平台入口。桌面版不会参与在线站点部署。

## 快速开始

```bash
bun install
bun run dev:web       # 在线版，http://localhost:3001
bun run dev:desktop   # Tauri 开发窗口
bun run tauri:icon    # 生成 Tauri 图标资源
```

如果移动目录、切换 workspace 依赖或升级 Next.js 后出现模块路径缓存错误，先运行：

```bash
bun run dev:web:clean
```

生产构建：

```bash
bun run build:web
bun --cwd apps/web start
```

## Google tag

在线版使用 Google tag（Google Analytics 4）。部署前在构建环境设置 GA4 衡量 ID，格式为 `G-XXXXXXXXXX`：

```bash
export NEXT_PUBLIC_GOOGLE_TAG_ID=G-XXXXXXXXXX
bun run build:web
```

`NEXT_PUBLIC_GOOGLE_TAG_ID` 未设置时不会加载 Google tag。该变量会被编译进前端产物，因此修改后需要重新构建并重启在线版服务。部署完成后可在浏览器开发者工具或 GA4 的实时报告中确认数据；本地开发环境建议不设置此变量。

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

## License

MIT


