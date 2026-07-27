# Management API boundary

管理前端只通过同源 `/api/management/*` BFF 调用 HogeTalk Agent：

- `generated/huameng.ts`：冻结 OpenAPI 的运行时 schema 与 DTO。
- `client/management.ts`：浏览器端类型安全请求、稳定错误与分页收敛。
- `mappers/management.ts`：DTO 到页面模型的转换。
- `server/session.ts`：服务端 API 地址、HttpOnly token Cookie、refresh rotation 和 CSRF。

浏览器代码不能读取 access token 或 refresh token。BFF 只代理显式白名单：

- 管理域手机号密码登录、refresh、logout；
- management me 与工作空间切换；
- 商会企业导入、任务结果、候选、关系和认证。

账号成员、入会审核、平台主体库和审计查询没有 W1/W2 实现，不得增加永远成功的占位请求。
