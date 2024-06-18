import type { RequestHandler } from "express";

import type {
  RawUnderSearchClassResponse,
  UnderSelectCourseInfo,
} from "./typings.js";
import { getCourses } from "./utils.js";
import type { AuthLoginFailedResponse } from "../../auth/index.js";
import type { ActionFailType } from "../../config/index.js";
import {
  MissingArgResponse,
  MissingCredentialResponse,
  UnknownResponse,
} from "../../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  EmptyObject,
  LoginOptions,
} from "../../typings.js";
import { EDGE_USER_AGENT_HEADERS } from "../../utils/index.js";
import { underStudyLogin } from "../login.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

export interface UnderSelectSearchOptions extends LoginOptions {
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

export type UnderSelectSearchSuccessResponse = CommonSuccessResponse<
  UnderSelectCourseInfo[]
>;

export type UnderSelectSearchResponse =
  | UnderSelectSearchSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse<ActionFailType.Unknown>;

export const underStudySearchCourseHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderSelectSearchOptions
> = async (req, res) => {
  try {
    const {
      id,
      password,
      link,
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

    if (id && password) {
      const result = await underStudyLogin({ id, password });

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(UNDER_STUDY_SERVER);
    } else if (!req.headers.cookie) {
      return res.json(MissingCredentialResponse);
    }

    if (!link) return res.json(MissingArgResponse("link"));

    const infoUrl = `${UNDER_STUDY_SERVER}${link}/hzkc`;

    const response = await fetch(infoUrl, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: req.headers.cookie,
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

    return res.json(UnknownResponse(message));
  }
};
