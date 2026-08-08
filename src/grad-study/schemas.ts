import { z } from "zod";

/** 登录请求（grad-study /login） */
export const gradStudyLoginSchema = z.object({
  id: z.number().int().positive(),
  password: z.string().min(1).max(128),
  authToken: z.string().min(1),
});

export type GradStudyLoginInput = z.infer<typeof gradStudyLoginSchema>;

/** 课表请求（grad-study /course-table） */
export const gradCourseTableSchema = z.object({
  time: z.string().min(1),
});

export type GradCourseTableInput = z.infer<typeof gradCourseTableSchema>;

/** 成绩详情请求（grad-study /grade-detail） */
export const gradGradeDetailSchema = z.object({
  gradeCode: z.string().min(1),
});

export type GradGradeDetailInput = z.infer<typeof gradGradeDetailSchema>;

/** 成绩列表请求（grad-study /grade-list） */
export const gradGradeListSchema = z.object({
  time: z.string().optional(),
});

export type GradGradeListInput = z.infer<typeof gradGradeListSchema>;
