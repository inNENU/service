import type { RequestHandler } from "express";

import { selectLogin } from "./login.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";

export interface SearchOptions extends Partial<LoginOptions> {
  server: string;

  /** 年级 */
  grade?: string;
  /** 专业 */
  major?: string;
  /** 课程类型 */
  courseType?: string;
  /** 课程名称 */
  courseName?: string;
  /** 开课单位 */
  office?: string;
  /** 周次 */
  week?: string;
  /** 节次 */
  index?: string;
  jx0502id: string;
}

export interface CourseBasicInfo {
  /** 课程号 */
  id: string;
  /** 课程名称 */
  name: string;
  /** 开课单位 */
  office: string;
  /** 课程类型 */
  type: string;
}

export interface SelectSearchSuccessResponse {
  success: true;
  /** 课程信息 */
  courses: CourseBasicInfo[];
}

export interface SelectSearchFailedResponse extends CommonFailedResponse {
  type?: LoginFailType.Expired;
}

export type SelectSearchResponse =
  | SelectSearchSuccessResponse
  | SelectSearchFailedResponse;

export const searchHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  SearchOptions
> = async (req, res) => {
  try {
    if (!req.headers.cookie) {
      if (!req.body.id || !req.body.password)
        return res.json({
          success: false,
          msg: "请提供账号密码",
        } as CommonFailedResponse);

      const result = await selectLogin(req.body as LoginOptions);

      if (!result.success) return res.json(result);

      req.body.server = result.server;
      req.headers.cookie = result.cookieStore.getHeader(result.server);
    }

    const {
      server,
      jx0502id,
      grade = "",
      major = "",
      courseType = "",
      courseName = "",
      office = "",
      week = "",
      index = "",
    } = req.body;

    // Tip: kcmc is not URL encoded
    const params = Object.entries({
      jx0502id,
      kclbs: courseType,
      kkdws: office,
      njs: grade,
      kcmc: courseName,
      zys: major,
      xq: week,
      jc: index,
    })
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    const url = `${server}xk/SeachKC`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: req.headers.cookie,
      },
      body: params,
    });

    const rawData = await response.text();

    if (rawData.match(/\s+<!DOCTYPE html/))
      return res.json({
        success: false,
        msg: "请重新登录",
        type: LoginFailType.Expired,
      } as SelectSearchFailedResponse);

    const courses = (JSON.parse(rawData) as Record<string, string>[]).map(
      ({ kch, kcmc, kkdw, szklb }) => ({
        id: kch,
        name: kcmc,
        office: kkdw,
        type: szklb,
      }),
    );

    console.log(`Getting ${courses.length} courses`);

    res.json({
      success: true,

      courses,
    } as SelectSearchSuccessResponse);
  } catch (err) {
    console.error(err);

    return res.json({
      success: false,
      msg: (err as Error).message,
    } as SelectSearchFailedResponse);
  }
};
