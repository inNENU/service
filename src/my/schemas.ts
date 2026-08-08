import { z } from "zod";

/** 登录请求（my /login） */
export const myLoginSchema = z.object({
  id: z.number().int().positive(),
  password: z.string().min(1).max(128),
  authToken: z.string().min(1),
});

export type MyLoginInput = z.infer<typeof myLoginSchema>;
