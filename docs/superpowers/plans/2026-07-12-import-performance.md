# Excel Import Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将一万行 Excel 导入从逐行全量落盘改为一次事务落盘，并增加可靠的前端阶段动画。

**Architecture:** `db.js` 提供事务包装器并在事务深度大于零时跳过 `saveDb()`；`routes/import.js` 用该包装器包裹整批导入。React 导入状态由请求生命周期控制，CSS 动画只表达处理中阶段，不伪造进度百分比。

**Tech Stack:** sql.js、Express、React 18、Ant Design、CSS keyframes、Node test runner。

## Tasks

- [x] 先写事务、导入路由和前端动画的失败测试并确认失败。
- [x] 实现 `withTransaction()` 和导入事务包装。
- [x] 实现导入阶段弹窗和 CSS 动画，重新构建前端 bundle。
- [x] 运行全量测试、构建和 diff 检查。
