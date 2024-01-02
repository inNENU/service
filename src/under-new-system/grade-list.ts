import type { RequestHandler } from "express";

import { underNewSystemLogin } from "./login.js";
import { SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/index.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { EDGE_USER_AGENT_HEADERS } from "../utils/index.js";

export interface UnderGradeListOptions extends Partial<LoginOptions> {
  /** 查询时间 */
  time?: string;
}
export interface ScoreDetail {
  score: number;
  percent: number;
}

export interface GradeDetail {
  usual: ScoreDetail[];
  exam: ScoreDetail | null;
}

export interface RawUnderGradeResultItem {
  /** 上课时间 */
  xnxqmc: string;
  /** 课程名称 */
  kcmc: string;
  /** 课程英文名称 */
  kcywmc: string;
  /** 课程类别 */
  kcdlmc: string;
  /** 课程成绩文字 */
  zcj: string;
  /** 课程实际成绩 */
  zcjfs: number;
  /** 考试性质 */
  ksxzmc: "正常考试" | "校际交流" | "补考";
  /** 成绩方式 */
  cjfsmc: "百分制" | "五级制";
  /** 学分 */
  xf: 3;
  /** 总学时 */
  zxs: 28;
  /** 修读方式名称 */
  xdfsmc: string;
  /** 开课单位 */
  kkbmmc: string;

  /** 学年学期代码 */
  xnxqdm: "202201";
  /** 课程编号 */
  kcbh: string;
  /** 课程平台编号 */
  kcptbh: string;
  /** 考试性质代码 */
  ksxzdm: string;
  /** 课程代码 */
  kcdm: string;
  /** 修读方式代码 */
  xdfsdm: string;
  /** 成绩代码 */
  cjdm: string;
  /** 考核分数代码 */
  khfsdm: string;

  /** 学生姓名 */
  xsxm: string;
  /** 学号 */
  xsbh: string;
  /** 学生代码 */
  xsdm: "22442910";

  xsckcj: "0";
  rownum_: 1;
  ismax: "1" | "0";
  isactive: "1";
  wpjbz: "";
  kcflmc: "";
  cjjd: "";
  bz: "";
  xsckcjbz: "";
  kcrwdm: "";
  wzc: "0";
  cjbzmc: "";
  wpj: "0";

  xmmc: "";
  rwdm: "";
  wzcbz: "";
}

export interface RawUnderGradeResult {
  data: "";
  rows: RawUnderGradeResultItem[];
  total: number;
}

export interface UnderNewGradeResult {
  /** 修读时间 */
  time: string;
  /** 课程 id */
  cid: string;
  /** 课程名称 */
  name: string;
  /** 分数 */
  grade: number;
  /** 成绩代码 */
  gradeCode: string;
  /** 分数文本 */
  gradeText: string;
  gradeType: "百分制" | "五级制";
  /** 课程类型 */
  courseType: string;
  /** 课程类型短称 */
  shortCourseType: string;
  /** 学时 */
  hours: number | null;
  /** 学分 */
  point: number;
  /** 考试性质 */
  examType: "正常考试" | "校际交流" | "补考";
}

export interface UnderGradeListSuccessResponse {
  success: true;
  data: UnderNewGradeResult[];
}

export type UnderGradeListResponse =
  | UnderGradeListSuccessResponse
  | AuthLoginFailedResult
  | CommonFailedResponse;

const QUERY_URL = `${SERVER}/new/student/xskccj/kccjDatas`;

const getGradeLists = (
  records: RawUnderGradeResultItem[],
): UnderNewGradeResult[] =>
  records.map(
    ({
      xnxqmc,
      kcmc,
      kcdlmc,
      zcj,
      zcjfs,
      ksxzmc,
      cjfsmc,
      xf,
      zxs,
      xdfsmc,
      kkbmmc,
      cjdm,
      kcptbh,
    }) => ({
      time: xnxqmc,
      cid: kcptbh,
      name: kcmc,
      grade: zcjfs,
      gradeCode: cjdm,
      gradeText: zcj,
      gradeType: cjfsmc,
      courseType: kcdlmc,
      shortCourseType: xdfsmc,
      office: kkbmmc,
      hours: zxs,
      point: xf,
      examType: ksxzmc,
    }),
  );

export const underGradeListHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderGradeListOptions
> = async (req, res) => {
  try {
    const { time = "" } = req.body;
    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      if (!req.body.id || !req.body.password)
        return res.json(<CommonFailedResponse>{
          success: false,
          msg: "请提供账号密码",
        });

      const result = await underNewSystemLogin(<LoginOptions>req.body);

      if (!result.success) return res.json(result);
      cookieHeader = result.cookieStore.getHeader(QUERY_URL);
    }

    const response = await fetch(QUERY_URL, {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/x-www-form-urlencoded",
        Referer: `${SERVER}/new/student/xskccj/kccjList.page`,
        ...EDGE_USER_AGENT_HEADERS,
      },
      body: new URLSearchParams({
        xnxqdm: time,
        source: "kccjlist",
        primarySort: "cjdm desc",
        page: "1",
        rows: "150",
        sort: "kcmc",
        order: "asc",
      }),
    });

    const { rows: records } = <RawUnderGradeResult>await response.json();

    const gradeList = getGradeLists(records);

    return res.json(<UnderGradeListSuccessResponse>{
      success: true,
      data: gradeList,
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};
