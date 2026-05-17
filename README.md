# 课程管理系统

包含四个模块：

- **课程管理**：课程代码、名称、学分、简介的增删改查。
- **学生管理**：学号、姓名、专业、入学年份等。
- **教师管理**：姓名、院系、职称、联系方式。
- **课程规划**：按学年学期创建开课计划（关联课程与任课教师、教室、容量），并管理学生选课（退选）。

## 技术栈

- 后端：Node.js + Express + MySQL（`mysql2`）
- 前端：React + Vite + React Router

## 前置条件

需要本地运行 MySQL 服务。默认连接配置：

| 变量 | 默认值 |
|---|---|
| `DB_HOST` | `127.0.0.1` |
| `DB_PORT` | `3306` |
| `DB_USER` | `root` |
| `DB_PASSWORD` | (空) |
| `DB_NAME` | `course_management` |
| `DB_SOCKET` | (空，使用 TCP 连接) |

可通过环境变量覆盖。若使用 Unix socket 连接，设置 `DB_SOCKET` 即可。

数据库和表会在首次启动时自动创建。

## 本地运行

1. 安装依赖（根目录会安装 server 与 client）：

```bash
cd course-management-system
npm install
npm run install:all
```

2. 同时启动 API 与前端（默认 API `3001`，前端 `5173` 并代理 `/api`）：

```bash
npm run dev
```

如需指定 socket 连接 MySQL：`DB_SOCKET=/path/to/mysql.sock npm run dev`

3. 浏览器打开：<http://127.0.0.1:5173>（Vite 已固定使用 `127.0.0.1`，并将 `/api` 代理到后端 `127.0.0.1:3001`）

## 单端口运行（推荐排查「页面空白 / 接口失败」）

若只开了前端没开后端，页面会提示无法连接 API。可用一条命令先构建再由 Express 同时提供页面与接口：

```bash
npm run start
```

浏览器打开：<http://127.0.0.1:3001/>

## 仅启动后端 API

```bash
npm run start:api
```

## 构建前端静态资源

```bash
npm run build
```

## 常见问题

- **MySQL 连接失败**：确认 MySQL 服务已启动，检查环境变量配置是否正确。
- **开发时接口报错**：请确认 **`npm run dev` 同时起了 server 与 client**；不要只运行 `npm run dev --prefix client`。
- **端口占用**：后端默认 `3001`，前端 `5173`。可设置环境变量 `PORT=3002` 等后改 `vite.config.js` 里 proxy 的 `target`。
