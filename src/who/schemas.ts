import { z } from "zod";

/** 登录请求（who /login） */
export const whoLoginSchema = z.object({
  id: z.number().int().positive(),
  password: z.string().min(1).max(128),
  authToken: z.string().min(1),
});

export type WhoLoginInput = z.infer<typeof whoLoginSchema>;

/** 个人信息请求（who /info） */
export const whoInfoSchema = z.object({
  id: z.number().int().positive(),
});

export type WhoInfoInput = z.infer<typeof whoInfoSchema>;
