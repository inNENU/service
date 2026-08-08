import { expiredResponse, unknownResponse } from "@/config/index.js";
import type { CommonSuccessResponse } from "@/typings.js";
import { EDGE_USER_AGENT_HEADERS } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../auth/index.js";

interface RawExamArrangementItem {
  /** 课程名称 */
  kcmc: string;
  /** 课程编号 */
  kcbh: string;
  /** 考试日期 */
  ksrq: string;
  /** 考试时间 */
  kssj: string;
  /** 考试形式代码（0=闭卷 / 1=开卷） */
  ksxs: string;
  /** 考核形式名称 */
  khxsmc: string;
  /** 考试类别名称 */
  kslbmc: string;
  /** 考试安排类型名称 */
  ksaplxmc: string;
  /** 周次（-1 表示未排定） */
  zc: string;
  /** 星期（-1 表示未排定） */
  xq: string;
  /** 占用节次 */
  jcdm2: string;
  /** 校区名称 */
  xqmc: string;
  /** 考场名称 */
  kscdmc: string;
  /** 座位号 */
  zwh: string | number;
  /** 试卷编号 */
  sjbh: string;
  /** 学时 */
  xs: number | string;
  /** 备注 */
  bz: string;
}

interface RawExamArrangementSuccessResult {
  data: "";
  rows: RawExamArrangementItem[];
  total: number;
}

interface RawExamArrangementFailedResult {
  code: number;
  data: string;
  message: string;
}

type RawExamArrangementResult = RawExamArrangementSuccessResult | RawExamArrangementFailedResult;

export interface ExamArrangementQueryOptions {
  /** 学年学期代码（如 202502），缺省查询全部学期 */
  time?: string;
  /** 考试类型代码（01随堂考/02学院考/03新生统考/04考试周统考/05补考统考/06专项考试） */
  type?: string;
  /** 考试类别代码（01期末考试/02补考考试/03理论测验/04实验考试/05重修考试/09社会考试） */
  category?: string;
}

export interface ExamArrangementResult {
  /** 课程名称 */
  name: string;
  /** 课程编号 */
  courseCode: string;
  /** 考试日期 */
  date: string;
  /** 考试时间 */
  time: string;
  /** 考试形式（闭卷/开卷） */
  form: string;
  /** 考核形式（笔试等） */
  assessmentForm: string;
  /** 考试类别（期末考试/社会考试等） */
  category: string;
  /** 考试安排类型（专项考试/考试周统考等） */
  arrangementType: string;
  /** 周次 */
  week: number | null;
  /** 星期 */
  weekday: number | null;
  /** 占用节次 */
  classPeriods: string;
  /** 校区 */
  campus: string;
  /** 考场 */
  room: string;
  /** 座位号 */
  seat: number | null;
  /** 试卷编号 */
  paperId: string;
  /** 学时 */
  hours: number | null;
  /** 备注 */
  note: string;
}

export type ExamArrangementSuccessResponse = CommonSuccessResponse<ExamArrangementResult[]>;

export type ExamArrangementResponse = ExamArrangementSuccessResponse | AuthLoginFailedResponse;

const EXAM_FORM_NAMES: Record<string, string> = { "0": "闭卷", "1": "开卷" };

const getExamForm = (ksxs: string): string => EXAM_FORM_NAMES[ksxs] ?? ksxs;

const getWeekNumber = (text: string): number | null => {
  const result = Number(text);

  return Number.isNaN(result) || result < 0 ? null : result;
};

const getSeatNumber = (value: string | number): number | null => {
  if (value === "") return null;

  const result = Number(value);

  return Number.isNaN(result) || result < 0 ? null : result;
};

const getExamArrangementResults = (records: RawExamArrangementItem[]): ExamArrangementResult[] =>
  records.map(
    ({
      kcmc,
      kcbh,
      ksrq,
      kssj,
      ksxs,
      khxsmc,
      kslbmc,
      ksaplxmc,
      zc,
      xq,
      jcdm2,
      xqmc,
      kscdmc,
      zwh,
      sjbh,
      xs,
      bz,
    }) => ({
      name: kcmc,
      courseCode: kcbh,
      date: ksrq,
      time: kssj,
      form: getExamForm(ksxs),
      assessmentForm: khxsmc,
      category: kslbmc,
      arrangementType: ksaplxmc,
      week: getWeekNumber(zc),
      weekday: getWeekNumber(xq),
      classPeriods: jcdm2,
      campus: xqmc,
      room: kscdmc,
      seat: getSeatNumber(zwh),
      paperId: sjbh,
      hours: getSeatNumber(xs),
      note: bz,
    }),
  );

export const TEST_EXAM_ARRANGEMENT_RESPONSE: ExamArrangementSuccessResponse = {
  success: true,
  data: Array.from({ length: 3 }, (_, index): ExamArrangementResult => ({
    name: `测试课程${index + 1}`,
    courseCode: "0000000000000",
    date: "2026-06-07",
    time: "08:30:00--09:30:00",
    form: "闭卷",
    assessmentForm: "笔试",
    category: "期末考试",
    arrangementType: "考试周统考",
    week: 13,
    weekday: 7,
    classPeriods: "01,02",
    campus: "本部",
    room: "逸夫教学楼305室",
    seat: index + 1,
    paperId: "225438461",
    hours: 18,
    note: "",
  })),
};

export const getStudyExamArrangement = async (
  cookieHeader: string,
  server: string,
  { time, type, category }: ExamArrangementQueryOptions,
): Promise<ExamArrangementResponse> => {
  const response = await fetch(`${server}/new/student/xsksrw/paginateXsksrw`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${server}/new/student/xsksrw/list.page`,
      ...EDGE_USER_AGENT_HEADERS,
    },
    body: new URLSearchParams({
      xnxqdm: time ?? "",
      ksaplxdm: type ?? "",
      kslbdm: category ?? "",
      page: "1",
      rows: "50",
      sort: "zc,xq,jcdm2",
      order: "asc",
    }),
  });

  if (response.headers.get("Content-Type")?.includes("text/html")) return expiredResponse;

  const data = (await response.json()) as RawExamArrangementResult;

  if ("code" in data) {
    if (data.message === "尚未登录，请先登录") return expiredResponse;

    return unknownResponse(data.message);
  }

  return {
    success: true,
    data: getExamArrangementResults(data.rows),
  };
};
