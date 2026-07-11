# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

达人数据管理平台 — 一个面向抖音、快手、B站达人（KOL）数据的内部管理仪表板。管理员可导入Excel批量创建达人/视频记录，按达人查看和编辑视频明细数据，导出数据，配置普通用户的编辑权限，以及查看操作审计日志。普通用户只能查看和编辑自己的数据。

## Commands

```bash
npm start          # 启动生产服务器 (node server.js)
npm run dev        # 启动开发服务器，文件变更自动重启 (node --watch server.js)
npm run build      # Babel 编译 JSX → public/app.build.js
```

- 默认端口 `3001`，通过 `.env` 的 `PORT` 修改。
- 没有测试框架、linter 或类型检查。
- 首次启动时自动创建 SQLite 数据库 (`data.db`) 和 admin 用户（默认 `admin` / `admin123`，通过 `ADMIN_USER` / `ADMIN_PASS` 环境变量覆盖）。
- 生产部署使用 PM2（配置见 `ecosystem.config.js`），CI 通过 GitHub Actions 在 push `master` 分支时 SSH 到阿里云服务器自动部署。

## 技术栈

- **后端**: Node.js + Express，Session-based 认证（`express-session`），bcryptjs 密码哈希
- **数据库**: SQLite，通过 **sql.js**（WASM 编译的 SQLite）运行，无原生依赖；每次写入后全量序列化到 `data.db` 文件
- **前端**: React 18 无构建步骤——第三方库（React、ReactDOM、Ant Design 5、Day.js）自托管在 `public/lib/`，业务代码 `public/app.js` 用 Babel 编译 JSX 为 `public/app.build.js`，浏览器直接加载
- **文件处理**: multer（截图上传，最多 10MB），ExcelJS（Excel 导入导出）
- **CSS**: 手写 `public/style.css`，使用 CSS 自定义属性（`var(--paper)`、`var(--ink-muted)` 等）

## 架构

```
server.js              → 入口：Express 初始化、中间件、路由挂载、SPA fallback
db.js                  → SQLite 层：initDb、自定义同步包装器（prepare/get/all/run）、列名转义
auth.js                → bcryptjs 密码操作 + admin 用户自动创建
middleware.js          → requireLogin / requireAdmin 守卫 + auditLog 变更记录函数
routes/
  auth.js              → POST /api/login、POST /api/logout、GET /api/me
  darens.js            → GET /api/darens（列表+搜索+分类过滤）、PUT /api/darens/:id
  videos.js            → GET /api/darens/:id/videos（含日期/违规/合规过滤）、PUT /api/videos/:id
  import.js            → POST /api/import（admin 上传 Excel，创建 darens + videos + users）
  export.js            → GET /api/export（admin 导出 Excel）
  upload.js            → POST /api/upload/:id/:field（截图上传到 uploads/ 目录）
  settings.js          → GET/PUT /api/settings/editable-columns（admin 配置普通用户可编辑列）
  audit.js             → GET /api/audit-logs（admin 查看操作日志）
public/
  index.html           → SPA 入口，加载 lib/*.min.js 和 app.build.js
  app.js               → React 组件源码（JSX），手动编辑后需 npm run build
  app.build.js         → Babel 编译产物，生产实际加载的文件
  style.css            → 全局样式
  lib/                 → 自托管第三方库（react、react-dom、antd、dayjs）
uploads/               → 截图上传存储目录（.gitignore 排除，保留 .gitkeep）
```

### 数据库表

- **darens**: 达人信息（nickname 唯一，organization、content_type、category、platform 等）
- **videos**: 视频数据（内部 `id` 主键，`work_id` 为作品业务 ID；`(daren_id, platform, work_id)` 唯一，支持共创达人共享作品 ID）
- **users**: 登录账户（display_name 唯一，password_hash，role ∈ admin/user）
- **settings**: 键值对配置（当前仅 `editable_columns`）
- **audit_logs**: 变更日志（操作人、表名、记录ID、字段、新旧值、时间）

### 权限模型

- **Admin**：可查看/编辑所有数据，导入导出 Excel，配置可编辑列，查看审计日志
- **普通用户**：只能查看和编辑 `nickname` 等于自己 `display_name` 的达人及其视频，且仅能编辑 admin 在设置中开启的列
- 所有 API 路由（除 login/logout/me）均受 `requireLogin` 保护；import/export/settings/audit 额外受 `requireAdmin` 保护

### sql.js 包装器 (db.js)

`prepare()` 返回一个同步风格的包装器（`.get()`、`.all()`、`.run()`），模拟 better-sqlite3 API。**关键点**：每次 `.run()` 写入后都会调用 `saveDb()` 将整个数据库序列化写入 `data.db` 文件。这是单进程设计——并发写入会导致数据丢失。对于动态 SQL 列名，使用 `escapeColumn()` 防止注入（sql.js 不支持列名参数绑定）。

### 前端状态管理

无路由库——`App` 组件用 `page` state 实现客户端路由（`'darens'` | `'videos'` | `'settings'` | `'audit'`）。达人列表页的"抖音/快手/B站"按钮直接跳转到该达人+平台的视频明细页。视频明细页支持行内编辑（Ant Design Table editable cells），编辑时表单值与原值 diff 后仅发送变更字段。

### Excel 导入格式

导入脚本按列号读取固定格式的 Excel（第1行为表头跳过）。达人列：12(昵称)、13(机构)、14(分类)、15(内容类型)、17(平台)、18(是否主平台)、19(平台昵称)、9(主页链接)、21(账号)、20(粉丝数)。视频列：25(作品ID)、27(发布时间)、22(标题)、23(标签)、24(内容链接)、26(时长)、28+(各项指标)、39-46(违规/合规/节点/爆款/申诉)。导入时自动为每个新达人创建同名用户账户（默认密码 `123456`）。
