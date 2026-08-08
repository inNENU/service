import { expiredResponse, unknownResponse } from "@/config/index.js";
import type {
  CommonFailedResponse,
  CommonListSuccessResponse,
  CommonSuccessResponse,
} from "@/typings.js";
import { EDGE_USER_AGENT_HEADERS } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../auth/index.js";

interface RawStudyPlanItem {
  /** 计划代码（查询明细的 key） */
  jxjhdm: string;
  /** 计划编号 */
  jxjhbh: string;
  /** 年级 */
  nd: number;
  /** 适用对象（专业） */
  sydx: string;
  /** 计划类型名称 */
  jhlxmc: string;
  /** 备注 */
  bz: string;
}

interface RawStudyPlanCourse {
  /** 课程名称 */
  kcmc: string;
  /** 课程编号 */
  kcbh: string;
  /** 学分 */
  xf: number;
  /** 总学时 */
  zxs: number;
  /** 开课学期 */
  kkxqmc1: string;
  /** 修读方式名称 */
  xdfsmc: string;
  /** 考核方式名称 */
  khfsmc: string;
  /** 课程大类名称 */
  kcdlmc: string;
  /** 成绩方式名称 */
  cjfsmc: string;
}

interface RawStudyPlanSuccessResult {
  data: "";
  rows: RawStudyPlanItem[] | RawStudyPlanCourse[];
  total: number;
}

interface RawStudyPlanFailedResult {
  code: number;
  data: string;
  message: string;
}

type RawStudyPlanResult = RawStudyPlanSuccessResult | RawStudyPlanFailedResult;

export interface StudyPlanListOptions {
  type: "list";
}

export interface StudyPlanDetailOptions {
  type: "detail";
  /** 计划代码（列表项的 planCode） */
  planCode: string;
  /** 页码（从 1 开始，缺省 1） */
  page?: number;
  /** 每页条数（缺省 50） */
  rows?: number;
}

export type StudyPlanOptions = StudyPlanListOptions | StudyPlanDetailOptions;

export interface StudyPlanItem {
  /** 计划编号 */
  planId: string;
  /** 计划代码（查询明细用） */
  planCode: string;
  /** 年级 */
  grade: number;
  /** 适用对象（专业） */
  major: string;
  /** 计划类型 */
  planType: string;
  /** 备注 */
  note: string;
}

export interface StudyPlanCourse {
  /** 课程名称 */
  name: string;
  /** 课程编号 */
  courseCode: string;
  /** 学分 */
  credit: number;
  /** 总学时 */
  hours: number;
  /** 开课学期 */
  semester: string;
  /** 修读方式 */
  studyType: string;
  /** 考核方式 */
  examType: string;
  /** 课程大类 */
  category: string;
  /** 成绩方式 */
  gradeMethod: string;
}

export type StudyPlanListSuccessResponse = CommonSuccessResponse<StudyPlanItem[]>;

export type StudyPlanDetailSuccessResponse = CommonListSuccessResponse<StudyPlanCourse[]>;

export type StudyPlanListResponse = StudyPlanListSuccessResponse | AuthLoginFailedResponse;

export type StudyPlanDetailResponse = StudyPlanDetailSuccessResponse | AuthLoginFailedResponse;

export type StudyPlanResponse =
  | StudyPlanListResponse
  | StudyPlanDetailResponse
  | CommonFailedResponse;

const getStudyPlanList = async (
  cookieHeader: string,
  server: string,
): Promise<StudyPlanListResponse> => {
  const response = await fetch(`${server}/new/student/xsjxjh/xsjxjhDatas`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${server}/new/student/xsjxjh/main.page`,
      ...EDGE_USER_AGENT_HEADERS,
    },
    body: new URLSearchParams({
      page: "1",
      rows: "50",
      sort: "jxjhbh",
      order: "asc",
    }),
  });

  const text = await response.text();

  // 学校部分 datagrid 接口返回 text/html 但 body 是 JSON，需用 body 内容判断登录跳转
  if (text.trim().startsWith("<")) return expiredResponse;

  let data: RawStudyPlanResult;

  try {
    data = JSON.parse(text) as RawStudyPlanResult;
  } catch {
    return expiredResponse;
  }

  if ("code" in data) {
    if (data.message === "尚未登录，请先登录") return expiredResponse;

    return unknownResponse(data.message);
  }

  return {
    success: true,
    data: (data.rows as RawStudyPlanItem[]).map(({ jxjhdm, jxjhbh, nd, sydx, jhlxmc, bz }) => ({
      planId: jxjhbh,
      planCode: jxjhdm,
      grade: nd,
      major: sydx,
      planType: jhlxmc,
      note: bz,
    })),
  };
};

const getStudyPlanDetail = async (
  cookieHeader: string,
  server: string,
  { planCode, page = 1, rows = 50 }: StudyPlanDetailOptions,
): Promise<StudyPlanDetailResponse> => {
  const response = await fetch(`${server}/new/student/xsjxjh/xsjxjhkcDatas?jxjhdm=${planCode}`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${server}/new/student/xsjxjh/main.page`,
      ...EDGE_USER_AGENT_HEADERS,
    },
    // 注意：primarySort 需保留 "+rwdm+asc" 原样（+ 为空格语义），
    // 不能用 URLSearchParams 编码（会变成 %2B 导致学校接口 500）
    body: `primarySort=+rwdm+asc&${new URLSearchParams({
      page: page.toString(),
      rows: rows.toString(),
      sort: "kkxqmc1",
      order: "asc",
    }).toString()}`,
  });

  const text = await response.text();

  // 学校部分 datagrid 接口返回 text/html 但 body 是 JSON，需用 body 内容判断登录跳转
  if (text.trim().startsWith("<")) return expiredResponse;

  let data: RawStudyPlanResult;

  try {
    data = JSON.parse(text) as RawStudyPlanResult;
  } catch {
    return expiredResponse;
  }

  if ("code" in data) {
    if (data.message === "尚未登录，请先登录") return expiredResponse;

    return unknownResponse(data.message);
  }

  return {
    success: true,
    data: (data.rows as RawStudyPlanCourse[]).map(
      ({ kcmc, kcbh, xf, zxs, kkxqmc1, xdfsmc, khfsmc, kcdlmc, cjfsmc }) => ({
        name: kcmc,
        courseCode: kcbh,
        credit: xf,
        hours: zxs,
        semester: kkxqmc1,
        studyType: xdfsmc,
        examType: khfsmc,
        category: kcdlmc,
        gradeMethod: cjfsmc,
      }),
    ),
    total: data.total,
    current: page,
  };
};

export const getStudyPlan = async (
  cookieHeader: string,
  server: string,
  options: StudyPlanOptions,
): Promise<StudyPlanResponse> =>
  options.type === "list"
    ? getStudyPlanList(cookieHeader, server)
    : getStudyPlanDetail(cookieHeader, server, options);

export const STUDY_PLAN_TEST_RESPONSE: StudyPlanListSuccessResponse = {
  success: true,
  data: [
    {
      planId: "202501164110",
      planCode: "10170253",
      grade: 2025,
      major: "汉语言文学",
      planType: "教学计划",
      note: "",
    },
  ],
};

export const STUDY_PLAN_DETAIL_TEST_RESPONSE: StudyPlanDetailSuccessResponse = {
  success: true,
  data: Array.from({ length: 3 }, (_, index): StudyPlanCourse => ({
    name: `测试课程${index + 1}`,
    courseCode: "0000000000000",
    credit: 4,
    hours: 72,
    semester: "2025年秋季学期",
    studyType: "通修",
    examType: "考试",
    category: "通识教育必修课",
    gradeMethod: "百分制",
  })),
  total: 3,
  current: 1,
};
