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
