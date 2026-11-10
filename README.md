# Imagine Studio

一个前后端分离的 AI 图片生成 MVP。用户输入中文或英文提示词，选择风格和画幅后异步生成图片；作品及生成状态持久化到 PostgreSQL。

## 技术栈

- 前端：React 19、TypeScript、Vite、Nginx
- 后端：FastAPI、SQLAlchemy Async、Alembic、LangChain
- 数据库：PostgreSQL 16
- 部署：Docker Compose
- 提示词模型：默认 `deepseek-v4-flash-vision-exp`
- 图片生成：默认 Pollinations，支持 OpenAI 兼容图片接口

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

默认 `IMAGE_PROVIDER=pollinations`，不需要图片密钥，适合本地 MVP 演示。生产环境可以切换到任何支持 `POST {base_url}/images/generations` 的服务：

```dotenv
IMAGE_PROVIDER=openai
IMAGE_MODEL=你的图片模型
IMAGE_API_BASE_URL=https://你的服务地址/v1
IMAGE_API_KEY=你的图片服务密钥
```

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

创建任务示例：

```bash
curl -X POST http://localhost:3000/api/v1/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "一座漂浮在云海上的未来图书馆",
    "style": "cinematic",
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
