// 企业工作台登录会话的冻结契约。
// 注意：该模块会同时被服务端 BFF 路由与客户端代码引用，
// 不能加 'use client'，否则服务端拿到的是 client reference 代理，
// zod safeParse 会抛 keyValidator._parse is not a function。
import { z } from 'zod'

export const enterpriseWorkspacePersonalSchema = z.object({
  type: z.literal('personal'),
  account_id: z.string(),
}).strict()

export const enterpriseWorkspaceEnterpriseSchema = z.object({
  type: z.literal('enterprise'),
  account_id: z.string(),
  enterprise_id: z.string(),
  membership_id: z.string(),
  role: z.enum(['owner', 'admin', 'member']),
  clearances: z.array(z.string()),
}).strict()

export const enterpriseWorkspaceAuthContextSchema = z.union([
  enterpriseWorkspacePersonalSchema,
  enterpriseWorkspaceEnterpriseSchema,
])

export const enterpriseSessionSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.literal('Bearer'),
  expires_in: z.number().int().positive(),
  account: z.object({
    id: z.string(),
    status: z.enum(['active', 'suspended']),
    display_name: z.string(),
    created_at: z.string(),
  }).strict(),
  context: enterpriseWorkspaceAuthContextSchema,
}).strict()
