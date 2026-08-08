import { z } from "zod";

/** 选课班级（select /class） */
export const selectClassSchema = z.object({
  link: z.string().min(1),
  courseId: z.string().min(1),
});

export type SelectClassInput = z.infer<typeof selectClassSchema>;

/** 选课信息（select /info） */
export const selectInfoSchema = z.object({
  link: z.string().min(1),
});

export type SelectInfoInput = z.infer<typeof selectInfoSchema>;

/** 选课搜索（select /search） */
export const selectSearchSchema = z.object({
  link: z.string().min(1),
  name: z.string().optional(),
  area: z.string().optional(),
  grade: z.number().int().positive().optional(),
  major: z.string().optional(),
  type: z.string().optional(),
  category: z.string().optional(),
  week: z.string().optional(),
  classIndex: z.string().optional(),
  teacher: z.string().optional(),
  place: z.string().optional(),
  office: z.string().optional(),
});

export type SelectSearchInput = z.infer<typeof selectSearchSchema>;

/** 选课操作（select /process）：add / remove 判别联合 */
const selectAddSchema = z.object({
  type: z.literal("add"),
  link: z.string().min(1),
  classId: z.string().min(1),
  name: z.string().optional(),
  courseId: z.string().optional(),
  weight: z.number().optional(),
});

const selectRemoveSchema = z.object({
  type: z.literal("remove"),
  link: z.string().min(1),
  classId: z.string().min(1),
  name: z.string().optional(),
  courseId: z.string().optional(),
  classCode: z.string().optional(),
});

export const selectProcessSchema = z.discriminatedUnion("type", [
  selectAddSchema,
  selectRemoveSchema,
]);

export type SelectProcessInput = z.infer<typeof selectProcessSchema>;

/** 已选课程（select /selected） */
export const selectSelectedSchema = z.object({
  link: z.string().min(1),
});

export type SelectSelectedInput = z.infer<typeof selectSelectedSchema>;

/** 评教列表（course-commentary type=list） */
export const commentaryListSchema = z.object({
  type: z.literal("list"),
  time: z.string().optional(),
});

export type CommentaryListInput = z.infer<typeof commentaryListSchema>;

/** 评教查看（course-commentary type=view） */
export const commentaryViewSchema = z.object({
  type: z.literal("view"),
  commentaryCode: z.string().min(1),
});

export type CommentaryViewInput = z.infer<typeof commentaryViewSchema>;

/** 评教获取（course-commentary type=get） */
export const commentaryGetSchema = z.object({
  type: z.literal("get"),
  teacherCode: z.string().min(1),
  courseCode: z.string().min(1),
});

export type CommentaryGetInput = z.infer<typeof commentaryGetSchema>;

/** 评教题目选项 */
const questionOptionSchema = z.object({
  text: z.string(),
  score: z.number(),
  name: z.string(),
  value: z.string(),
});

/** 评教题目 */
const questionSchema = z.object({
  title: z.string(),
  txdm: z.string(),
  zbdm: z.string(),
  options: z.array(questionOptionSchema),
});

/** 评教文本 */
const commentaryTextSchema = z.object({
  title: z.string(),
  txdm: z.string(),
  zbdm: z.string(),
  name: z.string(),
});

/** 评教提交（course-commentary type=submit） */
export const commentarySubmitSchema = z.object({
  type: z.literal("submit"),
  answers: z.array(z.number()),
  commentary: z.string(),
  params: z.record(z.string(), z.string()),
  questions: z.array(questionSchema).optional(),
  text: commentaryTextSchema.optional(),
});

export type CommentarySubmitInput = z.infer<typeof commentarySubmitSchema>;

/** 评教（course-commentary 判别联合） */
export const commentarySchema = z.discriminatedUnion("type", [
  commentaryListSchema,
  commentaryViewSchema,
  commentaryGetSchema,
  commentarySubmitSchema,
]);

export type CommentaryInput = z.infer<typeof commentarySchema>;
