# ADR 0007：使用 WPS 原生格式导出单元格图片

系统导出的截图需要在 WPS 中显示为真正的单元格内容，以便随单元格筛选、排序和复制到腾讯文档。ExcelJS 只能生成浮动图片；微软 Excel 的 `richData` 单元格图片在目标 WPS 版本中会显示 `#VALUE!`。因此，导出流程采用 WPS 原生的 `DISPIMG + cellimages.xml` 格式，并以用户在 WPS 中手动嵌入图片后保存的文件作为兼容性基准。

## 文件格式约定

每张图片使用同一个 `ID_<32位大写十六进制>` 串联单元格、图片描述和媒体文件：

1. 工作表单元格写入公式 `_xlfn.DISPIMG("ID_...",1)`，缓存值写为 `=DISPIMG("ID_...",1)`。
2. `xl/cellimages.xml` 为每张图片创建一个 `etc:cellImage`；其中 `xdr:cNvPr@name` 保存图片 ID，`a:blip@r:embed` 指向图片关系 ID。
3. `xl/_rels/cellimages.xml.rels` 将图片关系 ID 映射到 `xl/media/` 下的实际 PNG、JPEG 或 GIF 文件。
4. `xl/_rels/workbook.xml.rels` 增加关系类型 `http://www.wps.cn/officeDocument/2020/cellImage`，目标为 `cellimages.xml`。
5. `[Content_Types].xml` 增加 `/xl/cellimages.xml` 的 `application/vnd.wps-officedocument.cellimage+xml` 声明，并补齐实际图片扩展名的 MIME 类型。

这五处必须保持一致；仅写 `DISPIMG` 公式或仅把图片放进 `xl/media/` 都不能形成可显示的单元格图片。

## 实现方式

ExcelJS 继续负责表头、数据、样式和异常标红。`services/exportImages.js` 在写工作簿前收集有效的本地截图，为单元格生成 `DISPIMG` 公式，并记录图片 ID、格式和二进制内容。ExcelJS 生成基础工作簿后，再使用 JSZip 一次性补入上述 WPS 文件结构；`routes/export.js` 等待处理完成后再发送响应。

图片 ID 由单元格地址、截图字段和图片内容计算 SHA-256 后截取生成，保证同一次导出中稳定且不会因昵称等业务文本产生 XML 转义问题。只接受 `/uploads/` 下的直接文件名，并限制为 PNG、JPEG 和 GIF；无效路径、文件不存在或格式不支持时导出空单元格。

## 放弃的方案

- **ExcelJS 浮动图片**：视觉上覆盖单元格，但不属于单元格值，复制和筛选时无法满足需求。
- **微软 Excel `richData`**：Excel 新版本可识别，但目标 WPS 版本显示 `#VALUE!`，并可能在重新保存时清除对应图片数据。
- **`IMAGE()` 网络图片公式**：依赖长期可访问的公网图片地址和客户端网络，不适合当前本地上传文件。
- **直接写入腾讯文档**：会引入腾讯文档 API、认证和产品权限依赖，不作为 Excel 导出的前置条件。

## 兼容性和验证

该决策以 WPS 为首要兼容目标。微软 Excel 可能将 WPS 的 `DISPIMG` 显示为不支持的函数；如果未来必须同时支持两种客户端，应提供明确的“WPS 格式/Excel 格式”导出选项，不在同一单元格混合两套图片模型。

自动化测试必须验证：工作表存在 `DISPIMG` 公式；图片 ID 同时存在于 `cellimages.xml`；工作簿关系、内容类型、媒体文件和图片关系完整；输出中不存在 `xl/drawings/` 浮动图片和 `xl/richData/`。升级 ExcelJS、JSZip 或调整导出结构后，还应在目标 WPS 版本中执行一次真实导出和打开验证。
