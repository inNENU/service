import type { NextFunction, Request, Response } from "express-serve-static-core";
import type { ZodSchema } from "zod";

import { invalidArgResponse, missingArgResponse, unknownResponse } from "../config/index.js";
import type { ActionFailType } from "../config/index.js";
import type { CommonFailedResponse } from "../typings.js";

interface ZodParseIssue {
  code: string;
  path: (string | number)[];
  /** 英文错误消息（Zod 4 中"字段缺失"表现为 received undefined） */
  message: string;
}

interface ZodParseError {
  issues: ZodParseIssue[];
}

/** 字段中文名映射（跨模块通用字段）。未命中时回退使用原始字段名。 */
const FIELD_NAMES: Record<string, string> = {
  id: "学号",
  password: "密码",
  authToken: "认证令牌",
  // 时间/学期相关
  time: "学期",
  gradeCode: "成绩编号",
  // 选课相关
  link: "链接",
  courseId: "课程编号",
  classId: "班级编号",
  classCode: "班级代码",
  name: "名称",
  grade: "年级",
  area: "校区",
  major: "专业",
  type: "类型",
  category: "分类",
  week: "周次",
  classIndex: "节次",
  teacher: "教师",
  place: "地点",
  office: "单位",
  weight: "权重",
  // 通知相关
  noticeID: "通知编号",
  noticeUrl: "通知链接",
  size: "条数",
  current: "页码",
  // 评教相关
  commentaryCode: "评教编号",
  teacherCode: "教师编号",
  courseCode: "课程代码",
  answers: "答案",
  commentary: "评教内容",
  params: "参数",
  questions: "题目",
  txdm: "题型代码",
  zbdm: "指标代码",
  options: "选项",
  score: "分值",
  value: "值",
  text: "文本",
  title: "标题",
  // OA 邮箱申请
  account: "邮箱账号",
  suffix: "邮箱后缀",
  phone: "手机号",
  // 招生查询
  testId: "考生号",
  province: "省份",
  year: "年份",
  classType: "科类",
  majorType: "计划类型",
  nd: "招生年份",
  // 扩展信息
  webVPN: "VPN",
  username: "用户名",
  mobile: "手机号",
  openid: "OpenID",
  appId: "AppID",
  salt: "加密盐",
  smsCode: "短信验证码",
};

/**
 * 将 Zod 校验失败解析为中文、可读的失败响应。
 *
 * 规则： - 必填字段缺失（字段在请求体中不存在或为 undefined）→ `缺少${字段}参数` - 其余校验失败（类型/取值范围错误）→ `${字段}参数非法`
 *
 * @param error Zod 解析错误
 * @param rawBody 原始请求体（用于判断字段是否缺失，不依赖英文 message）
 * @returns 中文失败响应对象
 */
const resolveError = (
  error: ZodParseError,
  rawBody: unknown,
): CommonFailedResponse<ActionFailType> => {
  const [firstIssue] = error.issues;
  const field = firstIssue.path.join(".");
  const name = FIELD_NAMES[field] ?? field;

  // refine / superRefine 等顶层校验错误（path 为空）：直接用自定义 message 作为提示
  if (!field) return unknownResponse(firstIssue.message);

  // 缺失：invalid_type 且该字段在原始 body 中不存在
  const body = rawBody as Record<string, unknown> | null | undefined;
  const isMissing = firstIssue.code === "invalid_type" && (!body || !(field in body));

  if (isMissing) return missingArgResponse(name);

  return invalidArgResponse(name);
};

/**
 * 创建请求体校验中间件
 *
 * @param schema Zod schema
 * @returns Express 中间件
 */
export const validate =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      res.json(resolveError(result.error as unknown as ZodParseError, req.body));

      return;
    }

    req.body = result.data;
    next();
  };
