import { z } from "zod";

/** 登录请求（auth-center /login） */
export const authCenterLoginSchema = z.object({
  id: z.number().int().positive(),
  password: z.string().min(1).max(128),
  authToken: z.string().min(1),
});

export type AuthCenterLoginInput = z.infer<typeof authCenterLoginSchema>;

/** 头像请求（auth-center /avatar）：内联登录凭据（全给或全不给，缺则回退 cookie） */
export const avatarSchema = z.object({
  id: z.number().int().positive().optional(),
  password: z.string().min(1).max(128).optional(),
  authToken: z.string().min(1).optional(),
});

export type AvatarInput = z.infer<typeof avatarSchema>;
