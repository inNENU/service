import type { RequestHandler } from "express";

import type { AuthLoginFailedResult } from "../../auth/index.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../../typings.js";
import { EDGE_USER_AGENT_HEADERS } from "../../utils/index.js";
import { underStudyLogin } from "../login.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

export interface UnderSelectAddOptions extends LoginOptions {
  type: "add";
  /** 课程分类链接 */
  link: string;
  /** 课程名称 */
  name?: string;
  /** 课程 ID */
  courseId: string;
  /** 班级 ID */
  classId: string;
  /**
   * 权重
   *
   * @default -1
   */
  weight?: number;
}

export interface UnderSelectRemoveOptions extends LoginOptions {
  type: "remove";
  /** 课程分类链接 */
  link: string;
  /** 课程名称 */
  name?: string;
  /** 课程 ID */
  courseId: string;
  /** 班级代码 */
  classCode: string;
  /** 班级 ID */
  classId: string;
}

export type UnderSelectProcessOptions =
  | UnderSelectAddOptions
  | UnderSelectRemoveOptions;

interface RawUnderSelectProcessSuccessResponse {
  data: "";
  code: 0;
  msg: string;
}

interface RawUnderSelectProcessFailResponse {
  data: "";
  code: -1;
  msg: string;
}

type RawUnderSelectProcessResponse =
  | RawUnderSelectProcessSuccessResponse
  | RawUnderSelectProcessFailResponse;

export interface UnderSelectProcessSuccessResponse {
  success: true;
}

export type UnderSelectProcessResponse =
  | UnderSelectProcessSuccessResponse
  | AuthLoginFailedResult
  | (CommonFailedResponse & { type: "not-initialized" | "not-opened" });

export const underStudyProcessCourseHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderSelectProcessOptions
> = async (req, res) => {
  try {
    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      if (!req.body.id || !req.body.password)
        throw new Error(`"id" and password" field is required!`);

      const result = await underStudyLogin(req.body as AccountInfo);

      if (!result.success) return res.json(result);
      cookieHeader = result.cookieStore.getHeader(UNDER_STUDY_SERVER);
    }

    const { type, link } = req.body;

    if (!link) {
      return res.json({
        success: false,
        msg: "请提供选课信息链接",
      } as CommonFailedResponse);
    }

    const referer = `${UNDER_STUDY_SERVER}${link}`;

    if (type === "add") {
      if (!req.body.courseId || !req.body.classId)
        return res.json({
          success: false,
          msg: "请提供课程 ID 和班级 ID",
        } as CommonFailedResponse);

      const response = await fetch(`${referer}/add`, {
        method: "POST",
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          Cookie: cookieHeader,
          Referer: referer,
          ...EDGE_USER_AGENT_HEADERS,
        },
        body: new URLSearchParams({
          kcmc: req.body.name ?? "",
          kcrwdm: req.body.classId,
          qz: String(req.body.weight ?? -1),
          // NOTE: This is an unknown field, and currently can be omitted
          hlct: "0",
        }),
      });

      const data = (await response.json()) as RawUnderSelectProcessResponse;

      if (data.code !== 0) {
        if (data.code === -1 && data.msg === "当前不是选课时间")
          return res.json({
            success: false,
            msg: data.msg,
            type: "not-opened",
          } as CommonFailedResponse);

        return res.json({
          success: false,
          msg: data.msg,
        } as AuthLoginFailedResult);
      }

      return res.json({
        success: true,
      });
    }

    if (type === "remove") {
      const response = await fetch(`${referer}/cancel`, {
        method: "POST",
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          Cookie: cookieHeader,
          Referer: referer,
          ...EDGE_USER_AGENT_HEADERS,
        },
        body: new URLSearchParams({
          jxbdm: req.body.classCode ?? "",
          kcrwdm: req.body.classId,
          kcmc: req.body.name ?? "",
        }),
      });

      const data = (await response.json()) as RawUnderSelectProcessResponse;

      if (data.code !== 0) {
        if (data.code === -1 && data.msg === "当前不是选课时间")
          return res.json({
            success: false,
            msg: data.msg,
            type: "not-opened",
          } as CommonFailedResponse);

        return res.json({
          success: false,
          msg: data.msg,
        } as AuthLoginFailedResult);
      }

      return res.json({
        success: true,
      });
    }

    return res.json({
      success: false,
      msg: "未知操作类型",
    } as CommonFailedResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      msg: message,
    } as AuthLoginFailedResult);
  }
};
