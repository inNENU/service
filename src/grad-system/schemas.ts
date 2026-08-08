import { z } from "zod";

/** 登录请求（grad-system /login） */
export const gradSystemLoginSchema = z.object({
  id: z.number().int().positive(),
  password: z.string().min(1).max(128),
  authToken: z.string().min(1),
});

export type GradSystemLoginInput = z.infer<typeof gradSystemLoginSchema>;

/** 个人信息/综合信息请求（grad-system /info、/information）：内联登录凭据（全给或全不给，缺则回退 cookie） */
export const gradSystemInfoSchema = z.object({
  id: z.number().int().positive().optional(),
  password: z.string().min(1).max(128).optional(),
  authToken: z.string().min(1).optional(),
});

export type GradSystemInfoInput = z.infer<typeof gradSystemInfoSchema>;
