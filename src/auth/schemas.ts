import { z } from "zod";

/** 统一身份认证登录 */
export const authLoginSchema = z.object({
  id: z.number().int().positive(),
  password: z.string().min(6).max(64),
  authToken: z.string(),
});

export type AuthLoginInput = z.infer<typeof authLoginSchema>;

/** 账户初始化信息获取 */
export const authInitInfoSchema = z.object({
  id: z.number().int().positive(),
  authToken: z.string().optional(),
  appId: z.string().optional(),
  openid: z.string().optional(),
});

export type AuthInitInfoInput = z.infer<typeof authInitInfoSchema>;

/** 账户初始化提交 */
export const authInitSchema = z.object({
  id: z.number().int().positive(),
  password: z.string().min(6).max(64),
  authToken: z.string(),
  salt: z.string(),
  params: z.record(z.string(), z.string()),
  appId: z.union([z.string(), z.number()]),
  openid: z.string(),
});

export type AuthInitInput = z.infer<typeof authInitSchema>;

/** 账户激活 */
export const authActivateSchema = z.object({
  type: z.string(),
});

export type AuthActivateInput = z.infer<typeof authActivateSchema>;

/** 二次认证 */
export const reAuthSchema = z.object({
  id: z.number().int().positive(),
  smsCode: z.string(),
  password: z.string(),
  openid: z.string(),
  appId: z.union([z.string(), z.number()]),
  authToken: z.string().optional(),
});

export type ReAuthInput = z.infer<typeof reAuthSchema>;

/** 密码重置 */
export const resetPasswordSchema = z.object({
  id: z.number().int().positive(),
  authToken: z.string().optional(),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
