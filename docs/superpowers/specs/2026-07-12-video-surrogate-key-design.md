# 视频主键支持共创达人设计

## 背景

当前 `videos.work_id` 同时承担外部作品 ID 和数据库主键。共创场景下，同一个作品会出现在多个达人名下，因此导入第二个达人时会触发主键冲突并被 `INSERT OR IGNORE` 跳过。

## 目标

- 允许同一个 `work_id` 关联多个达人。
- 保留同一达人、同一平台、同一作品的重复导入去重能力。
- 编辑、截图上传、前端表格行定位改用稳定的内部视频 ID。
- Excel 导入/导出继续使用业务字段“作品ID”，不改变用户表格格式。

## 方案

将 `videos` 表改为：

```sql
id INTEGER PRIMARY KEY AUTOINCREMENT,
work_id TEXT NOT NULL,
daren_id INTEGER NOT NULL,
platform TEXT NOT NULL,
UNIQUE(daren_id, platform, work_id)
```

旧表通过 SQLite 重建迁移，先复制原有数据，再恢复索引和外键约束。迁移只在检测到旧结构时执行，并保留原字段与数据。

导入使用新的内部 ID 写入记录；发生同一达人/平台/作品的唯一约束冲突时继续计入 `skippedConflict`。不同达人即使 `work_id` 相同，也会各自产生一条视频记录。

## 接口和前端

- `PUT /api/videos/:id` 按内部 `id` 查询和更新。
- `POST /api/upload/:id/:field` 按内部 `id` 查询和更新截图。
- 视频列表返回 `id` 和 `work_id`；前端 `rowKey`、编辑状态和上传 URL 使用 `id`。
- 导出查询仍导出 `v.work_id`，避免改变 Excel 列名和内容。
- 审计日志的 `record_id` 改记内部视频 `id`，避免同作品不同达人之间相互覆盖含义。

## 兼容和错误处理

- 对不存在的内部视频 ID 返回现有的“视频不存在”错误。
- 不接受通过 `work_id` 猜测内部记录的旧更新接口，避免共创记录定位歧义。
- 迁移失败时抛出错误并停止启动，不在不完整结构上继续运行。

## 验证

增加回归测试覆盖：

1. 相同 `work_id`、不同达人可以同时存在。
2. 相同达人/平台/作品重复写入被唯一约束拦截。
3. 编辑和截图上传按内部 `id` 只影响目标达人记录。
4. 导出仍输出原作品 ID。

