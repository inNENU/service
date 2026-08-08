import { z } from "zod";

/** 本科录取查询（enroll /under-admission） */
export const underAdmissionSchema = z.object({
  name: z.string().min(1),
  id: z.string().min(1),
  testId: z.string().min(1),
});

export type UnderAdmissionInput = z.infer<typeof underAdmissionSchema>;

/** 本科历史分数查询基础字段 */
const historyScoreQuerySchema = z.object({
  type: z.literal("query"),
  province: z.string().min(1),
  year: z.string().min(1),
  classType: z.string().min(1),
  majorType: z.string().min(1),
});

/** 本科历史分数（enroll /under-history-score 判别联合） */
export const underHistoryScoreSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("info") }),
  historyScoreQuerySchema,
]);

export type UnderHistoryScoreInput = z.infer<typeof underHistoryScoreSchema>;

/** 本科招生计划（enroll /under-plan 判别联合） */
export const underPlanSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("info") }),
  historyScoreQuerySchema,
]);

export type UnderPlanInput = z.infer<typeof underPlanSchema>;

/** 研究生招生计划（enroll /grad-plan） */
export const gradEnrollPlanSchema = z.object({
  year: z.number().int().positive().optional(),
});

export type GradEnrollPlanInput = z.infer<typeof gradEnrollPlanSchema>;
