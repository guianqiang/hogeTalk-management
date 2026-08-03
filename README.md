# HogeTalk 2.0 管理前端

华盟管理、运营和商会管理员共用的 Next.js 管理台。当前版本对接 HogeTalk Agent
`feature/huameng-w1-w2` 分支冻结的真实接口，不再使用浏览器 mock 数据。

## 本地运行

先启动 Agent 后端和依赖，再启动前端：

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

默认访问 `http://localhost:3000/login`。服务端变量
`MANAGEMENT_API_BASE_URL` 默认指向 `http://127.0.0.1:8790/v1`，不要以 `NEXT_PUBLIC_`
暴露。

登录使用 HogeTalk 账号手机号、国家代码和密码。账号必须具备实时
`management.access@platform:hm` grant。

## 已接入的真实链路

- `hm_management` 独立认证域的手机号密码登录、refresh rotation 和 logout。
- HttpOnly 管理会话 Cookie、同源 BFF 原样转发和写请求 CSRF 校验。浏览器的
  `/api/<path>` 会转发为 Agent 基址下的 `/<path>`，BFF 不增删 `management`
  或 `v1` 前缀。
- 实时工作空间发现与幂等切换。
- 商会 UTF-8 CSV 企业导入、任务轮询和结果汇总。
- 商会 affiliation、certification、待补标识 candidate 查询。
- 商会认证与平台 `verification_status` 独立展示。
- 企业 L1–L3 平台认证审核队列、详情、补件、批准和驳回闭环。
- 平台认领审核、重复企业、所有权争议和后台账号管理页面及真实接口调用。
- 平台菜单沿用旧华盟在线的信息架构；旧站内容模块在新接口开放前显示明确的待开放状态。

## 当前契约边界

重复企业、所有权争议、后台账号管理、平台企业主体库和旧站内容管理接口仍随服务端波次
逐步开放。前端已按完整接口文档实现对应页面；服务端尚未开放时显示可重试的待开放状态，
不会回退 mock 或提交占位写请求。当前契约只提供管理账号只读信息，尚无账号资料修改接口。

## CSV 模板

必填列为 `legal_name`、`country_code`。有权威标识时同时填写
`identifier_type`、`identifier_value`；无标识行只创建商会范围的候选记录。

## 质量命令

```bash
pnpm typecheck
pnpm test
pnpm build
```

Next 16 的开发和构建脚本显式使用 webpack，生产构建输出 standalone。
