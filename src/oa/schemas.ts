import { z } from "zod";

/** 登录请求（oa /login） */
export const oaLoginSchema = z.object({
  id: z.number().int().positive(),
  password: z.string().min(1).max(128),
  authToken: z.string().min(1),
});

export type OALoginInput = z.infer<typeof oaLoginSchema>;

/** 邮箱状态检查（email-apply type=init） */
const checkEmailSchema = z.object({
  type: z.literal("init"),
  id: z.number().int().positive(),
  password: z.string().min(1).max(128).optional(),
  authToken: z.string().min(1).optional(),
});

export type CheckEmailInput = z.infer<typeof checkEmailSchema>;

/** 邮箱申请（email-apply type=apply） */
const applyEmailSchema = z.object({
  type: z.literal("apply"),
  id: z.number().int().positive(),
  account: z.string().min(1),
  suffix: z.string().optional(),
  phone: z.string().min(1),
});

export type ApplyEmailInput = z.infer<typeof applyEmailSchema>;

/** 邮箱申请/检查请求（oa /email-apply 判别联合） */
export const emailApplySchema = z.discriminatedUnion("type", [checkEmailSchema, applyEmailSchema]);

export type EmailApplyInput = z.infer<typeof emailApplySchema>;
