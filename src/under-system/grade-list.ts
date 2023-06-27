import type { RequestHandler } from "express";
import type { Cookie } from "set-cookie-parser";

import { underSystemLogin } from "./login.js";
import { getTimeStamp } from "./utils.js";
import type { LoginFailedResponse, LoginOptions } from "../auth/index.js";
import type { EmptyObject } from "../typings.js";
import { IE_8_USER_AGENT, getCookieHeader } from "../utils/index.js";

type CourseType =
  | "通识教育必修课"
  | "通识教育选修课"
  | "专业教育必修课"
  | "专业教育选修课"
  | "教师职业教育必修课"
  | "教师职业教育选修课"
  | "任意选修课"
  | "发展方向课"
  | "教师教育必修课"
  | "教师教育选修课";

interface UnderGradeListAuthOptions extends LoginOptions {
  /** 查询时间 */
  time?: string;
  /** 课程名称 */
  name?: string;
  /** 课程性质 */
  courseType?: CourseType;
  gradeType?: "all" | "best";
}

interface UnderGradeListCookieOptions {
  cookies: Cookie[];
  /** 查询时间 */
  time?: string;
  /** 课程名称 */
  name?: string;
  /** 课程性质 */
  courseType?: CourseType;
  gradeType?: "all" | "best";
}

export type UserGradeListOptions =
  | UnderGradeListAuthOptions
  | UnderGradeListCookieOptions;

interface GradeResult {
  time: string;
  cid: string;
  courseName: string;
  difficulty: number;
  grade: number;
  creditScore: number;
  mark: string;
  courseType: string;
  commonType: string;
  shortCourseType: string;
  hours: number | null;
  credit: number;
  examType: string;
  reLearn: string;
  status: string;
}

export interface UserGradeListSuccessResponse {
  status: "success";
  data: GradeResult[];
}

export type UserGradeListFailedResponse = LoginFailedResponse;

export type UserGradeListResponse =
  | UserGradeListSuccessResponse
  | UserGradeListFailedResponse;

const gradeItemRegExp = /<tr.+?class="smartTr"[^>]*?>(.*?)<\/tr>/g;
const gradeCellRegExp =
  /^(?:<td[^>]*?>[^<]*?<\/td>){3}<td[^>]*?>([^<]*?)<\/td><td[^>]*?>([^>]*?)<\/td><td[^>]*?>([^<]*?)<\/td><td[^>]*?>([^>]*?)<\/td><td[^>]*?>(.*?)<\/td><td[^>]*?>([^<]*?)<\/td><td[^>]*?>([^<]*?)<\/td><td[^>]*?>([^<]*?)<\/td><td[^>]*?>([^<]*?)<\/td><td[^>]*?>([^<]*?)<\/td><td[^>]*?>([^<]*?)<\/td><td[^>]*?>([^<]*?)<\/td><td[^>]*?>([^<]*?)<\/td><td[^>]*?>([^<]*?)<\/td><td[^>]*?>([^<]*?)<\/td>/;
const gradeNumberRegExp = /<a[^>]*?>([^<]*?)<\/a>/;
const courseTypes: Record<CourseType, string> = {
  通识教育必修课: "01",
  通识教育选修课: "02",
  专业教育必修课: "03",
  专业教育选修课: "04",
  教师职业教育必修课: "05",
  教师职业教育选修课: "06",
  任意选修课: "09",
  发展方向课: "10",
  教师教育必修课: "11",
  教师教育选修课: "12",
};

const getDisplayTime = (time: string): string => {
  const [startYear, endYear, semester] = time.split("-");

  return semester === "1" ? `${startYear}年秋季学期` : `${endYear}年春季学期`;
};

export const getGradeList = (content: string): GradeResult[] =>
  Array.from(content.matchAll(gradeItemRegExp)).map(([, item]) => {
    const [
      ,
      time,
      cid,
      courseName,
      difficulty,
      grade,
      creditScore,
      mark = "",
      courseType,
      commonType,
      shortCourseType,
      hours,
      credit,
      examType,
      reLearn,
      status,
    ] = Array.from(gradeCellRegExp.exec(item)!).map((item) =>
      item.replace(/&nbsp;/g, " ").trim()
    );

    const actualGrade = grade
      ? Number(gradeNumberRegExp.exec(grade))
      : (Number(creditScore) / Number(credit)) * 10 + 50;

    return {
      time,
      cid,
      courseName,
      difficulty: Number(difficulty) || 1,
      grade: actualGrade,
      creditScore: Number(creditScore),
      mark,
      courseType,
      commonType,
      shortCourseType,
      hours: hours ? Number(hours) : null,
      credit: Number(credit),
      examType,
      reLearn: reLearn ? getDisplayTime(reLearn) : "",
      status,
    };
  });

export const underGradeListHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UserGradeListOptions
> = async (req, res) => {
  try {
    let cookies: Cookie[] = [];

    const {
      time = "",
      name = "",
      courseType = "",
      gradeType = "all",
    } = req.body;

    if ("cookies" in req.body) {
      ({ cookies } = req.body);
    } else {
      const result = await underSystemLogin(req.body);

      if (result.status === "failed") return res.json(result);

      ({ cookies } = result);
    }

    const params = new URLSearchParams({
      kksj: time,
      kcxz: courseType ? courseTypes[courseType] || "" : "",
      kcmc: name,
      xsfs: gradeType === "best" ? "zhcj" : gradeType === "all" ? "qbcj" : "",
      ok: "",
    });

    console.log("Using params", params);

    const headers = {
      Cookie: getCookieHeader(cookies),
      Referer: `https://dsjx.webvpn.nenu.educn/jiaowu/cjgl/xszq/query_xscj.jsp?tktime=${getTimeStamp()}`,
      "User-Agent": IE_8_USER_AGENT,
    };

    console.log("Using headers", headers);

    const response = await fetch(
      `https://dsjx.webvpn.nenu.edu.cn/xszqcjglAction.do?method=queryxscj`,
      {
        method: "POST",
        headers,
        body: params.toString(),
      }
    );

    console.log(response.status);

    const content = await response.text();

    const gradeList = getGradeList(content);

    return res.json(<UserGradeListSuccessResponse>{
      status: "success",
      data: gradeList,
    });
  } catch (err) {
    res.json(<LoginFailedResponse>{
      status: "failed",
      msg: (<Error>err).message,
    });
  }
};
