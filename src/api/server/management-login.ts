import { z } from 'zod'

export const managementLoginRequestSchema = z.object({
  identifier: z.string().min(4).max(64),
  country_code: z.string().regex(/^[A-Z]{2}$/),
  password: z.string().min(8).max(128),
}).strict()

type ManagementLoginRequest = z.infer<typeof managementLoginRequestSchema>

export function managementLoginBackendBody(input: ManagementLoginRequest) {
  return {
    identifier: input.identifier.trim(),
    country_code: input.country_code,
    password: input.password,
  }
}
