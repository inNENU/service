import { z } from "zod";

/** 登录请求（action /login） */
export const actionLoginSchema = z.object({
  id: z.number().int().positive(),
  password: z.string().min(1).max(128),
  authToken: z.string().min(1),
});

export type ActionLoginInput = z.infer<typeof actionLoginSchema>;

/** 通知详情请求（action /notice-detail）：noticeID 或 noticeUrl 至少提供一个 */
export const noticeDetailSchema = z
  .object({
    noticeID: z.string().min(1).optional(),
    noticeUrl: z.string().min(1).optional(),
  })
  .refine(({ noticeID, noticeUrl }) => Boolean(noticeID ?? noticeUrl), {
    message: "请提供公告ID或公告链接",
  });

export type NoticeDetailInput = z.infer<typeof noticeDetailSchema>;

/** 通知列表请求（action /notice-list） */
export const noticeListSchema = z.object({
  type: z.enum(["notice", "news"]).optional(),
  size: z.number().int().positive().optional(),
  current: z.number().int().positive().optional(),
});

export type NoticeListInput = z.infer<typeof noticeListSchema>;
