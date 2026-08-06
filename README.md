# HogeTalk Management

华盟在线管理前端（Next.js）。对接 HogeTalk Agent 真实接口，覆盖四类入口：

| 入口 | 路径 | 用途 |
| --- | --- | --- |
| 平台管理员 | `/admin/login` | 人员、权限与治理 |
| 平台运营 | `/operation/login` | 企业、内容、认证与日常运营 |
| 商会管理员 | `/chamber/login` | 会员企业、商会认证与组织协作 |
| 企业工作台 | `/enterprise/login` | 企业入驻、平台认证、供需、合作咨询、AI 名片 |

门户选择页：`/login`。

## 本地运行

先启动 Agent（默认 `http://127.0.0.1:8790`），再启动本项目：

```bash
cp .env.example .env.local
pnpm install
pnpm dev
```

默认访问 `http://localhost:3000/login`。

服务端变量 `MANAGEMENT_API_BASE_URL` 默认 `http://127.0.0.1:8790/v1`，仅服务端使用，不要改成 `NEXT_PUBLIC_`。

企业管理端支持账号密码与手机号验证码登录（验证码环境以 Agent 配置为准）。

## 会话与 BFF

- 登录后写入 HttpOnly Cookie；浏览器只请求同源 `/api/*`。
- BFF 原样转发 path / query / body，并校验写请求 CSRF（`X-Management-CSRF`）。
- 浏览器不保存 Bearer Token；不向公开网站签发免登 ticket。

## 主要能力

**平台 / 运营 / 商会**

- 工作空间发现与菜单授权
- 企业入驻审核、L1–L3 平台认证、认领 / 重复企业 / 所有权争议
- 商会会员导入（UTF-8 CSV）、affiliation / certification
- 内容与商品等运营模块（服务端未开放时页面展示待开放，不回退 mock）

**企业工作台**

- 企业资料与入驻申请、平台认证申请与查看
- 供需创建、编辑、发布与撤回；发布后网站公开可见
- 合作咨询：收到的跟进、发出的查看
- 网站供需详情可跳转 `/enterprise/login?next=consult&itemId={id}`，登录后进入咨询页
- 企业 AI 名片维护与公开分享

## CSV 导入模板

必填：`legal_name`、`country_code`。有权威标识时同时填 `identifier_type`、`identifier_value`；无标识行只创建商会范围候选记录。

## 质量命令

```bash
pnpm typecheck
pnpm test
pnpm build
```

开发与构建使用 webpack；生产构建输出 standalone。
