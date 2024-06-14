import type { RequestHandler } from "express";

import type { RawUnderSelectClassItem } from "./typings.js";
import type { AuthLoginFailedResult } from "../../auth/index.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../../typings.js";
import { EDGE_USER_AGENT_HEADERS } from "../../utils/index.js";
import { underStudyLogin } from "../login.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

export interface UnderSelectSearchOptions extends Partial<LoginOptions> {
  /** 课程分类链接 */
  link: string;
  /** 课程名称 */
  name?: string;
  /** 校区 */
  area?: string;
  /** 年级 */
  grade?: number;
  /** 专业 */
  major?: string;
  /** 课程分类 */
  courseCategory?: string;
  /** 周次 */
  week?: string;
  /** 节次 */
  classIndex?: string;
  /** 教师 */
  teacher?: string;
  /** 地点 */
  location?: string;
  /** 开课单位 */
  courseOffice?: string;
}

interface RawUnderSearchClassResponse {
  data: "";
  rows: RawUnderSelectClassItem[];
  total: number;
}

export interface UnderSelectSearchCourse {
  /** 上课时间 */
  time: string;
  /** 课容量 */
  capacity: number;

  /** 课程类别 */
  courseType: string;
  /** 课程分类 */
  courseCategory: string;
  /** 教师 */
  teacher: string;
  /** 地点 */
  location: string;
  /** 开课单位 */
  courseOffice: string;
  /** 总学时 */
  hours: number;
  /** 班级代码 */
  classCode: string;
}

export interface UnderSelectSearchSuccessResponse {
  success: true;
  data: UnderSelectSearchCourse[];
}

export type UnderSelectSearchResponse =
  | UnderSelectSearchSuccessResponse
  | AuthLoginFailedResult
  | (CommonFailedResponse & { type: "not-initialized" });

const getCourses = (
  records: RawUnderSelectClassItem[],
): UnderSelectSearchCourse[] =>
  records.map(
    ({
      zcxqjc,
      pkrs,
      kcmc,
      kcdlmc,
      kcflmc,
      teaxms,
      jxcdmcs,
      kkyxmc,
      kcptdm,
      kcrwdm,
      zxs,
      jxbdm,
    }) => ({
      time: zcxqjc,
      capacity: pkrs,
      name: kcmc,
      courseType: kcdlmc,
      courseCategory: kcflmc,
      teacher: teaxms,
      location: jxcdmcs,
      courseOffice: kkyxmc,
      hours: zxs,
      courseId: kcptdm,
      classCode: jxbdm,
      classId: kcrwdm,
    }),
  );

export const underStudySearchCourseHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderSelectSearchOptions
> = async (req, res) => {
  try {
    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      if (!req.body.id || !req.body.password)
        return res.json({
          success: false,
          msg: "请提供账号密码",
        } as CommonFailedResponse);

      const result = await underStudyLogin(req.body as LoginOptions);

      if (!result.success) return res.json(result);
      cookieHeader = result.cookieStore.getHeader(UNDER_STUDY_SERVER);
    }

    const {
      link = "",
      name = "",
      area = "",
      grade = "",
      major = "",
      courseCategory = "",
      week = "",
      classIndex = "",
      teacher = "",
      location = "",
      courseOffice = "",
    } = req.body;

    if (!link) {
      return res.json({
        success: false,
        msg: "请提供选课信息链接",
      } as CommonFailedResponse);
    }

    const infoUrl = `${UNDER_STUDY_SERVER}${link}/hzkc`;

    const response = await fetch(infoUrl, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: cookieHeader,
        Referer: `${UNDER_STUDY_SERVER}${link}`,
        ...EDGE_USER_AGENT_HEADERS,
      },
      body: new URLSearchParams({
        kkyxdm: courseOffice,
        xqdm: area,
        nd: grade.toString(),
        zydm: major,
        kcdldm: "",
        xq: week,
        jc: classIndex,
        kcxx: name,
        kcfl: courseCategory,
        jxcdmc: location,
        teaxm: teacher,
        page: "1",
        row: "1000",
        sort: "kcrwdm",
        order: "asc",
      }),
    });

    const data = (await response.json()) as RawUnderSearchClassResponse;

    return res.json({
      success: true,
      data: getCourses(data.rows),
    } as UnderSelectSearchSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      msg: message,
    } as AuthLoginFailedResult);
  }
};
