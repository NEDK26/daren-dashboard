# Modules

`modules/` 按业务能力组织新功能。每个模块至少声明：

- `key`：稳定的模块标识；
- `capability`：对应的部署能力标识；
- `dependencies`：显式声明依赖的其他模块；
- `routes` / `pages`：服务端路由和前端页面入口；
- `status`：`planned`、`active` 或 `deprecated`。

现有根级路由和 `public/app.js` 暂不批量迁移；新功能优先遵循此约定。

