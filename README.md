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

## 网站账号

网页版导航右侧提供 **Sign in / Register**，使用 Ant Design 弹窗完成注册和登录，
不会跳转、重建编辑器或清空未保存代码。游客仍可编辑、运行和保存本地文件；
桌面版不接入账号，也没有新增登录限制。

Pygrounds **共用 twinsant.com 的账号和 Google Authenticator 验证器**：

- 已有账号：输入相同邮箱，再输入验证器中 `twinsant.com` 条目的 6 位动态码。
- 新账号：邮件由 twinsant.com 的认证服务发送，包含配置二维码和手动密钥；
  配置后输入动态码完成注册，也可用此账号登录 twinsant.com。
- 两个网站分别登录，Host-only / HttpOnly Cookie 不跨域共享；在一个网站退出，
  不会撤销另一个网站的独立会话。不会改为顶级域 Cookie 或自动单点登录。
- 邮箱在账户菜单中脱敏显示，邮件配置材料是长期凭据，请勿转发，绑定后删除。
  目前没有验证器找回功能。
- **登录不上传、同步或隔离已有本地代码**。文件仍在当前浏览器的 localStorage；
  同一浏览器中的本地文件不会因切换账号而改变。暂未增加云端文件存储。

网站不直接持有 MongoDB 凭据或认证加密密钥，而是通过 Next.js 同源代理复用
`twinsant/api/fapi/web_auth.py` 的认证服务和 `twinsant_web_auth` 数据库：

```text
/api/auth/{start,verify,me,logout} → http://127.0.0.1:8000/auth/totp/{action}
```

本地开发先启动该 FastAPI 服务（默认仅信任本机 3001、5173 和正式域名）。
若认证服务地址不同，在构建/开发环境设置：

```bash
PYGROUNDS_AUTH_API_ORIGIN=http://127.0.0.1:8000 bun run build:web
```

该变量必须是仅包含 HTTP(S) 协议、主机和可选端口的 origin，不带路径、账号、
查询或 fragment。Next.js 会在构建时固化 rewrite，修改后需重新构建。
不要把认证密钥或 Mailgun 配置放进 `NEXT_PUBLIC_*` 或 Pygrounds 前端。
认证服务不可用时导航显示可重试错误，不阻断游客编辑器，也不伪装成已登录。

上线前还需：

1. 发布认证服务的 Pygrounds 可信来源支持。在后端现有 `.env` 的
   `TWINSANT_AUTH_ALLOWED_ORIGINS` 中**保留原有来源并加入**
   `https://python.twinsant.com`，然后重启 fapi。
   生产环境示例为
   `https://www.twinsant.com,https://twinsant.com,https://python.twinsant.com`。
   若显式配置了该变量，更新代码中的默认值不会替代它。
2. Pygrounds 与 fapi 同在主机 `t` 时无需额外代理配置；其他主机应配置可达的
   `PYGROUNDS_AUTH_API_ORIGIN`。生产必须同源 HTTPS，保留安全 Cookie。
3. 发布仓库 nginx 配置，其转发头覆盖 `X-Forwarded-For` 为真实客户端地址；
   不应信任客户端伪造的转发头。后端 Uvicorn 只信任本机反向代理。
4. 按下述现有 git 部署脚本发布网页版；无需改动 MongoDB、复制密钥或迁移账号。

认证传输和配置回归测试使用 Bun 内置 runner：

```bash
bun run test:auth
```

## 登录后使用 Agent

网页版右侧新增 Agent 面板，游客必须先登录；编辑、运行和本地保存仍无需登录。
服务端每次调用都使用现有 `twinsant_session` 验证有效、已激活的账号，并检查请求来源，
不是仅隐藏前端入口。桌面版不接入此功能。

- 前端沿用 agents3 的 POST + SSE 交互，展示 `tool_start`、`tool_result`、
  `reply` 和 `error`；最终回复整体返回，暂不逐 token 输出。
- Next.js 将 `/api/agent` 同源代理到现有 FastAPI 的 `/pygrounds/agent`，
  与登录代理共用 `PYGROUNDS_AUTH_API_ORIGIN`。修改代理地址后需要重新构建。
- 后端在 `twinsant/api/fapi/mini_agent.py` 移植 agents3 的工具/最终回复循环，
  仅保留浏览器代码适用的工具，不依赖 agents3 服务或微信网关。
- 点击 Send 会把**当前文件路径、完整代码和问题**发送给服务器及 Anthropic。
  其他本地文件不会上传；不要在当前代码中包含密钥。对话按登录用户隔离，
  服务端保存最近 12 条问答，闲置 30 天后过期。浏览器刷新或 New chat 开始新会话；
  退出、换号或认证失效会清除当前面板，不删除本地代码文件。
- `read_file` 仅查看本次提交的快照；`propose_code` 返回可预览的完整替换代码。
  用户点击 **Apply to editor** 才会修改编辑缓冲区，支持 Monaco 撤销，
  不自动保存或执行。切换文件或编辑过原代码后，旧提案会被拒绝，须重新请求。
- 不能访问服务器文件、执行 shell 或服务端 Python；Python 仍由 Pyodide 运行。
  请求超时 180 秒，每账号同时最多一个请求、每 10 分钟最多 20 次；
  Stop 会中止连接，后端取消正在进行的模型调用。

在现有 FastAPI 服务的服务端环境中配置（**不要设置为 `NEXT_PUBLIC_*`**）：

```bash
ANTHROPIC_API_KEY=...
PYGROUNDS_AGENT_MODEL=<该 API key 可用的 Claude 模型 ID>
# 可选：沿用现有 ANTHROPIC_BASE_URL、HTTPX_PROXY
```

未配置 key 或模型时，Agent 返回明确的 503，不影响游客编辑器。
需先发布 FastAPI 代码并重启服务，再构建发布 Pygrounds 网页版；启动时会创建
Agent 会话和并发锁的 MongoDB TTL 索引，不需新增依赖。
Next.js 代理超时已设为 240 秒；部署时还需运行 `./ops/deploy-nginx.sh`，
为 `/api/agent` 禁用 nginx 缓冲并设置 240 秒超时。其他中间代理也应保留 SSE 流式传输。

回归测试：

```bash
bun run test:agent
# 在 twinsant/api/fapi 目录：
./.venv/bin/python -m unittest discover -s tests -p 'test_pygrounds_agent.py'
```

## 网页版可调整面板

桌面端文件列表与工作区、工作区与 Agent 之间有左右拖拽分隔条，编辑器与控制台
之间有上下拖拽分隔条。支持鼠标和触摸拖拽，并限制最小尺寸，避免挤没相邻面板。
宽高调整会触发 Monaco 和 xterm 的自动适配，不重建编辑器、终端或 Agent。

分隔条可用 Tab 聚焦，再按方向键调整（Shift 加快），Home / End 调到当前允许
的最小 / 最大尺寸，双击或按 Enter 恢复默认大小。调整在当前页面内保留，
关闭再打开 Agent 或切换语言/主题不会重置；刷新页面恢复默认布局。
窄屏仍使用现有文件抽屉和 Agent 浮层，不显示侧边宽度分隔条；
编辑器/控制台的高度分隔条保留。

```bash
bun run test:panels
```

## 网页版多语言

导航栏的语言按钮支持 **简体中文 / English**，首次访问按浏览器语言列表选择
首个支持的语言，均不支持时使用英语。手动选择保存在 `localStorage` 的
`pygrounds-language`，刷新后保留，并同步到同源其他标签页；未手动选择时跟随
浏览器语言变更。本地存储不可用时仍可切换，并明确提示设置无法持久化。

语言字典位于 `apps/web/lib/locales/en.js` 和 `zh-CN.js`，新增文案须保持键名和
插值参数一致。界面、Ant Design 内置控件、登录步骤、Agent 操作与状态、
主题提示、终端帮助和后续系统提示会随语言切换；页面 `lang` 属性同步更新。
切换不会重载页面、重建编辑器/终端或清空代码、对话、草稿和登录表单。
代码、文件名、用户输入、Python 输出/异常、已有终端输出和模型生成内容保持原文；
远端错误保留诊断原文，并添加本地化错误说明。Monaco/Vim 自带菜单和状态保留
其默认语言。网页版语言设置不影响桌面版，也不会自动翻译认证邮件。

```bash
bun run test:i18n
```

## 网页版明暗模式

右上角太阳/月亮按钮切换浅色和深色。首次访问跟随系统偏好，手动选择保存在
`localStorage` 的 `pygrounds-theme`，刷新后继续使用，也会同步到同源其他标签页。
浏览器禁止本地存储时仍可切换，但会明确提示设置无法持久化。

配色参考 twinsant.com 的深海军蓝、石板灰表面和单一蓝色强调色设计，并扩展对应
浅色方案。语义颜色统一定义在 `apps/web/lib/theme.js`，同时驱动页面 CSS、
Ant Design（包括登录弹窗）、Monaco 编辑器和 xterm 终端；普通/次要文字与终端
ANSI 颜色均有 4.5:1 对比度回归测试。切换只更新主题，不重建编辑器、终端或
Agent 会话，因此未保存代码、终端输出和对话会保留。桌面版暂不改变。

```bash
bun run test:theme
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
- `deploy-from-git.sh` 会在远端 `/root/projects/Pygrounds` 执行 `git fetch`、切分支、`bun install --frozen-lockfile`，使用服务配置的 Node 22 运行时构建 Next.js，然后重启服务
- 构建和 systemd 固定使用 `/root/projects/twinsant.com/node-v22.23.4-linux-x64-glibc-217/bin/node`。主机 `t` 需要 glibc 2.17 兼容包；升级时先校验并安装新运行时，再同步构建路径和服务模板，重新部署 systemd 配置并重启。重启后需核对实际进程版本，不能只检查 shell 的 `node --version`。
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
