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

export interface UnderSelectSelectedOptions extends Partial<LoginOptions> {
  /** 课程分类链接 */
  link: string;
}

interface RawUnderSelectedClassResponse {
  data: "";
  rows: RawUnderSelectClassItem[];
  total: number;
}

export interface UnderSelectSelectedCourse {
  /** 上课时间 */
  time: string;
  /** 课容量 */
  capacity: number;
  /** 课程名称 */
  name: string;
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
  /** 课程代码 */
  courseId: string;
  /** 班级代码 */
  classId: string;
}

export interface UnderSelectSelectedSuccessResponse {
  success: true;
  data: UnderSelectSelectedCourse[];
}

export type UnderSelectSelectedResponse =
  | UnderSelectSelectedSuccessResponse
  | AuthLoginFailedResult
  | (CommonFailedResponse & { type: "not-initialized" });

const getSelectedCourses = (
  records: RawUnderSelectClassItem[],
): UnderSelectSelectedCourse[] =>
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

export const underStudySelectedCourseHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderSelectSelectedOptions
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

    const { link } = req.body;

    if (!link) {
      return res.json({
        success: false,
        msg: "请提供选课信息链接",
      } as CommonFailedResponse);
    }

    const infoUrl = `${UNDER_STUDY_SERVER}${link}/yxkc`;

    const response = await fetch(infoUrl, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: cookieHeader,
        Referer: `${UNDER_STUDY_SERVER}${link}`,
        ...EDGE_USER_AGENT_HEADERS,
      },
      body: new URLSearchParams({
        page: "1",
        row: "1000",
        sort: "kcrwdm",
        order: "asc",
      }),
    });

    const data = (await response.json()) as RawUnderSelectedClassResponse;

    return res.json({
      success: true,
      data: getSelectedCourses(data.rows),
    } as UnderSelectSelectedSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      msg: message,
    } as AuthLoginFailedResult);
  }
};
