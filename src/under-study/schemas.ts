import { z } from "zod";

/** 登录请求（under-study /login） */
export const underStudyLoginSchema = z.object({
  id: z.number().int().positive(),
  password: z.string().min(1).max(128),
  authToken: z.string().min(1),
});

export type UnderStudyLoginInput = z.infer<typeof underStudyLoginSchema>;

/** 课表请求（under-study /course-table） */
export const courseTableSchema = z.object({
  time: z.string().min(1),
});

export type CourseTableInput = z.infer<typeof courseTableSchema>;

/** 成绩详情请求（under-study /grade-detail） */
export const gradeDetailSchema = z.object({
  gradeCode: z.string().min(1),
});

export type GradeDetailInput = z.infer<typeof gradeDetailSchema>;

/** 成绩列表请求（under-study /grade-list） */
export const gradeListSchema = z.object({
  time: z.string().optional(),
});

export type GradeListInput = z.infer<typeof gradeListSchema>;

/** 考试安排请求（under-study /exam-arrangement，全部参数可选） */
export const examArrangementSchema = z.object({
  time: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
});

export type ExamArrangementInput = z.infer<typeof examArrangementSchema>;

/** 学习计划请求（under-study /study-plan 判别联合） */
export const underStudyPlanSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("list") }),
  z.object({
    type: z.literal("detail"),
    planCode: z.string().min(1),
    page: z.number().int().positive().optional(),
    rows: z.number().int().positive().optional(),
  }),
]);

export type UnderStudyPlanInput = z.infer<typeof underStudyPlanSchema>;

/** 上课任务请求（under-study /task，全部参数可选） */
export const underStudyTaskSchema = z.object({
  time: z.string().optional(),
});

export type UnderStudyTaskInput = z.infer<typeof underStudyTaskSchema>;
