# ADR 0002：Excel 标红单元格导入为"数据异常"标记

- **日期**：2026-07-11
- **状态**：已接受

## 背景

用户在 Excel 中以红色背景标记异常数据单元格（表示"数据异常"），导入后该标记丢失，前端展示为普通数据，导出时也无法还原。

## 决策

1. **videos 表新增 `anomaly_data` 字段**（TEXT，存 JSON）：`{"列名":"数据异常",...}`
2. **导入时自动识别**：ExcelJS 读取 `cell.fill`，若背景色在红色范围（RGB 中 R >> G+B），将该列名加入 `anomaly_data`
3. **达人列表页**：`GET /api/darens` 聚合统计每个达人所有视频的异常格子总数（SUM of JSON key count），昵称旁显示 🔴N
4. **视频明细页**：标红列以浅红色背景渲染（`background: #fff1f0`）
5. **导出 Excel**：`anomaly_data` 中的列在导出时设置红色背景
6. **仅导入识别**，不支持前端手动切换标红状态
7. **先只支持"数据异常"一种原因**，JSON 格式已预留扩展，后续可加"人工修正"等

## 影响

### 数据库变更
- `videos` 表新增 `anomaly_data TEXT DEFAULT ''`

### 后端变更
- `routes/import.js`：解析 `cell.fill`，识别红色背景，写入 `anomaly_data`
- `routes/darens.js`：GET 时用子查询聚合异常格子总数
- `routes/export.js`：导出时对异常列设置红色背景

### 前端变更
- 达人列表：昵称旁显示 🔴N 异常计数
- 视频明细：标红列表格浅红色背景
