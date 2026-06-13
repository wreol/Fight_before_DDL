# 大学地牢 (College Dungeon)

> 暗黑哥特 × 大学生存 = 反差幽默。一款回合制地牢 Roguelike 网页游戏。

你是一个普通大学生。从大一新生开始，在随机生成的大学学期中探索、战斗、成长。击败早八点名、体测1000m、期中考试、期末周……活到大四毕业。

## 快速开始

### Docker（推荐）
```bash
docker compose up
```
访问 http://localhost

### 本地开发

**前端：**
```bash
cd client
npm install
npm run dev
```
访问 http://localhost:5173

**后端：**
```bash
cd server
python -m venv venv
source venv/Scripts/activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload
```
后端运行在 http://localhost:8000

## 运行测试

```bash
# 前端测试
cd client && npx vitest run

# 后端测试
cd server && python -m pytest tests/ -v
```

## 操作说明

- **↑↓←→** 方向键移动
- 碰到敌人自动攻击
- **I** 键使用药水
- **空格** 等待一回合
- 踩到 **▼** 进入下一层

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite + Canvas API + shadcn/ui + Zustand |
| 后端 | Python FastAPI + SQLite + SQLAlchemy |
| 部署 | Docker Compose (Nginx + Uvicorn) |
| CI/CD | GitHub Actions |
| 设计系统 | Discord (Open Design) |

## 目录结构

```
college-dungeon/
├── client/              # React 前端
│   ├── src/
│   │   ├── types/       # TypeScript 类型定义
│   │   ├── engine/      # 游戏引擎（纯逻辑）
│   │   ├── renderer/    # Canvas 渲染器
│   │   ├── components/  # React UI 组件
│   │   ├── store/       # Zustand 状态管理
│   │   ├── api/         # 后端 API 客户端
│   │   ├── save/        # localStorage 存档
│   │   └── styles/      # 设计 Tokens
│   └── tests/
├── server/              # FastAPI 后端
│   ├── app/
│   │   ├── routers/     # API 路由（seed, leaderboard, share）
│   │   ├── models.py    # ORM 数据模型
│   │   └── database.py  # SQLite 连接
│   └── tests/
├── docker-compose.yml
├── Dockerfile.client
├── Dockerfile.server
└── .github/workflows/ci.yml
```

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| 后端端口 | 8000 | FastAPI 服务端口 |
| 前端端口 | 80 | Nginx 服务端口 |

## License

MIT
