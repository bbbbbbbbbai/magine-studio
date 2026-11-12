# Imagine Studio

一个前后端分离的 AI 图片生成 MVP。用户输入中文或英文提示词，选择风格和画幅后异步生成图片；作品及生成状态持久化到 PostgreSQL。

## 技术栈

- 前端：React 19、TypeScript、Vite、Nginx
- 后端：FastAPI、SQLAlchemy Async、Alembic、LangChain
- 数据库：PostgreSQL 16
- 部署：Docker Compose
- 提示词模型：默认 `deepseek-v4-flash-vision-exp`
- 图片生成：可在 Flux 与 GPT Image 2.5 间切换，支持 OpenAI 兼容图片接口
- 角色参考：人像、服装、姿势三类图库与三合一配方提示词
- 用户身份：UUID 身份、Root/游客角色和作品隔离

## 快速启动

1. 复制环境变量：

   ```powershell
   Copy-Item .env.example .env
   ```

2. 在 `.env` 中按需填写模型密钥：

   ```dotenv
   LLM_MODEL=deepseek-v4-flash-vision-exp
   LLM_API_KEY=你的密钥
   LLM_BASE_URL=https://api.deepseek.com
   ```

   `LLM_API_KEY` 为空时仍可运行，后端会使用本地规则扩写提示词。密钥只存在于后端容器，不会进入前端构建产物。

3. 启动全部服务：

   ```powershell
   docker compose up --build
   ```

4. 打开：

   - 应用：<http://localhost:3000>
   - API 文档：<http://localhost:3000/api/docs>
   - 健康检查：<http://localhost:3000/api/v1/health>

停止服务使用 `docker compose down`。数据库和生成图片位于命名卷中，普通 `down` 不会删除数据；只有显式执行 `docker compose down -v` 才会删除卷。

## 模型职责

`deepseek-v4-flash-vision-exp` 是文本/视觉理解模型，不负责直接输出图片。因此项目把工作拆成两个可独立配置的阶段：

1. LangChain + DeepSeek 将用户想法扩写为最终视觉提示词。
2. 图片服务根据最终提示词生成位图。

图片模型可以在前端创作台直接切换。`Flux` 使用 Pollinations，不需要密钥；`GPT Image 2.5` 使用独立的 OpenAI 兼容图片接口：

```dotenv
# 默认打开创作台时选中的模型
IMAGE_MODEL=z-image-2.5

POLLINATIONS_MODEL=flux
Z_IMAGE_MODEL=z-image-2.5

GPT_IMAGE_MODEL=gpt-image-2.5
GPT_IMAGE_API_BASE_URL=https://api.openai.com/v1
GPT_IMAGE_API_KEY=你的图片服务密钥
```

当前可在创作台切换的模型包括：

- `z-image-2.5`（默认）
- `flux`
- `gpt-image-2.5`
- `qwen-image-3-pro`
- `z-image-pro`
- `anime-v4-5`
- `seedream-5-pro`
- `anime-v5`

除 Flux 外，其余模型共用 `GPT_IMAGE_API_BASE_URL` 和
`GPT_IMAGE_API_KEY`，也可以通过 `IMAGE_MODEL` 设置默认选中项。

`Z-image2.5` 默认使用同一套 OpenAI 兼容图片接口和 `GPT_IMAGE_API_KEY`。
如果密钥为空，前端仍会显示该模型，但会标记为“待配置”并禁用生成按钮。

创作台支持拖入或上传最多 4 张参考图。
图片会在浏览器中压缩后随任务提交，后端保存参考图并调用
`POST {base_url}/images/edits`；Flux 等纯文本生图模型不支持参考图时会给出明确提示。

也可以把默认模型直接设为 GPT Image 2.5：

```dotenv
IMAGE_MODEL=gpt-image-2.5
GPT_IMAGE_API_KEY=你的图片服务密钥
```

生产环境可以继续切换到任何支持 `POST {base_url}/images/generations` 的服务：

```dotenv
IMAGE_PROVIDER=openai
IMAGE_MODEL=你的图片模型
IMAGE_API_BASE_URL=https://你的服务地址/v1
IMAGE_API_KEY=你的图片服务密钥
```

## 角色参考库

“角色图库”页接入了完整的人像、服装和姿势索引，支持：

- 人像库：正脸与造型氛围、发长、发型筛选
- 服装库：现实、动漫、中国历代服装与多来源分类
- 姿势库：动作分类、角度与素体白模/深度图切换
- 实时中文搜索、分页加载、高清预览与原图跳转
- 人像 + 服装 + 姿势三合一配方，自动生成结构化中文提示词并送入创作台
- 安全模式默认开启，隐藏成人向人体与服装参考
- 配方保存在浏览器本地，返回页面后仍会保留

为避免把约 1 GB 的图片直接复制进仓库，默认在浏览器中按需读取公开素材：

```dotenv
VITE_REFERENCE_DATA_BASE=https://raw.githubusercontent.com/anhao/ai-pose-gallery-zh/main
VITE_REFERENCE_ASSET_BASE=https://ai-pose-gallery.anhao.app
```

这两个变量可在构建时改为自己的对象存储或 CDN。素材索引及图片来自
[Anhao 的三合一参考库](https://github.com/anhao/ai-pose-gallery-zh)
及其标注的原始作者站点；图片版权和使用限制归原作者所有，不应把素材打包倒卖。

图库中的角色配方会转换成文本提示词；创作台手动上传的参考图则会随任务
提交给支持 `/images/edits` 的图片编辑模型。

## 用户身份与权限

- 首次进入页面时自动生成并保存一个 UUID，页面会提示用户复制保存。
- 所有生成记录通过 `X-User-ID` 请求头绑定 UUID，历史列表、详情和删除接口均按 UUID 隔离。
- 角色分为 `root` 和 `guest`。游客的安全模式固定开启，只有 Root 可以切换安全模式。
- 当前 Root UUID 固定为 `e8b2ee31-0e36-4d52-a601-ab37d18bf6d5`；如留空，则数据库中第一个注册的 UUID 自动成为 Root：

```dotenv
ROOT_USER_UUID=e8b2ee31-0e36-4d52-a601-ab37d18bf6d5
```

用户可通过头像入口重新查看、复制或恢复已保存的 UUID。该 UUID 相当于当前 MVP 的登录凭证，
不应公开分享。

移动端 H5 布局不会渲染 API 文档入口、素材原站链接和“查看原图”等外部跳转入口；
桌面端仍保留这些开发与素材溯源入口。

## GitHub CI/CD

仓库内置两个 GitHub Actions 工作流：

- `.github/workflows/ci.yml`：PR 和 `main` 推送时运行前后端测试、Lint、前端构建和镜像构建校验。
- `.github/workflows/deploy.yml`：CI 成功后构建前后端镜像并推送到 GHCR；配置部署变量后可通过 SSH 自动更新服务器。

镜像地址：

```text
ghcr.io/bbbbbbbbbai/magine-studio/backend:latest
ghcr.io/bbbbbbbbbai/magine-studio/frontend:latest
```

在 GitHub 仓库的 `Settings -> Secrets and variables -> Actions` 中配置自动部署：

Repository Variables：

```text
DEPLOY_ENABLED=true
DEPLOY_PATH=/opt/magine-studio
SSH_PORT=22
RELEASE_PORT=3001
```

Repository Secrets：

```text
SSH_HOST
SSH_USER
SSH_PRIVATE_KEY
SSH_KNOWN_HOSTS
```

服务器首次准备：

```bash
git clone https://github.com/bbbbbbbbbai/magine-studio.git /opt/magine-studio
cd /opt/magine-studio
cp .env.example .env
# 编辑 .env，至少填写 ROOT_USER_UUID、GPT_IMAGE_API_KEY 和图片接口地址
chmod +x scripts/deploy-server.sh
```

GHCR 镜像包为私有状态时，需要在服务器先登录一次：

```bash
echo "你的-GitHub-Token" | docker login ghcr.io -u 你的GitHub用户名 --password-stdin
```

也可以在 GitHub Packages 中把两个容器包改为公开。自动发布使用独立
Compose 项目 `imagine-studio-release` 和独立数据卷，默认监听 `3001` 端口，
不会覆盖现有 `APP_PORT` 服务。验证新版本后，可将域名或反向代理切换到发布端口。

自动部署会执行：

```text
git pull -> docker compose pull -> docker compose up -> alembic upgrade head
```

未设置 `DEPLOY_ENABLED=true` 时只运行 CI 和 GHCR 镜像发布，不会改动服务器。

## 项目结构

```text
.
├── backend
│   ├── alembic/                 # 数据库迁移
│   └── app
│       ├── api/routes/          # 版本化 HTTP 路由
│       ├── core/                # 环境配置
│       ├── db/                  # 数据模型与会话
│       ├── schemas/             # Pydantic 输入/输出
│       └── services/            # LLM、图片与生成编排
├── frontend
│   └── src
│       ├── components/          # 工作台 UI
│       ├── api.ts               # API 客户端
│       └── types.ts             # 共享前端类型
└── docker-compose.yml
```

## API

主要接口：

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| `POST` | `/api/v1/generations` | 创建异步生成任务 |
| `GET` | `/api/v1/generations` | 查询历史记录 |
| `GET` | `/api/v1/generations/{id}` | 查询单个任务状态 |
| `DELETE` | `/api/v1/generations/{id}` | 删除任务和图片 |
| `GET` | `/api/v1/config` | 获取可公开的运行配置 |
| `GET` | `/api/v1/health` | 检查数据库与服务状态 |
| `POST` | `/api/v1/users/initialize` | 注册或恢复 UUID 身份 |
| `GET` | `/api/v1/users/me` | 查询当前 UUID 的角色 |

除健康检查、公共配置和 UUID 初始化外，业务接口都需要携带 `X-User-ID`。

创建任务示例：

```bash
curl -X POST http://localhost:3000/api/v1/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "一座漂浮在云海上的未来图书馆",
    "style": "realistic",
    "aspect_ratio": "16:9",
    "enhance_prompt": true
  }'
```

接口先返回 `202 Accepted` 与任务 ID，前端轮询任务直至 `completed` 或 `failed`。

## 本地开发

后端建议使用 Python 3.12：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
alembic upgrade head
uvicorn app.main:app --reload
```

前端：

```powershell
cd frontend
npm install
npm run dev
```

Vite 会把 `/api`、`/media` 代理到 `http://localhost:8000`。

验证命令：

```powershell
cd frontend
npm run lint
npm run build

cd ..\backend
pytest
ruff check .
```

## 当前边界

这是单用户 MVP。异步任务使用 FastAPI 进程内后台任务，未引入 Redis/Celery；服务重启时仍在处理中的任务不会自动恢复。若用于多用户生产环境，建议增加身份认证、配额与限流、对象存储，以及独立的持久化任务队列。
