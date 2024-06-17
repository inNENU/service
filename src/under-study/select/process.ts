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
  /** 班级 ID */
  classId: string;

  /** 课程名称 */
  name?: string;
  /** 课程 ID */
  courseId?: string;
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
  /** 班级 ID */
  classId: string;

  /** 课程名称 */
  name?: string;
  /** 课程 ID */
  courseId?: string;
  /** 班级代码 */
  classCode?: string;
}

export type UnderSelectProcessOptions =
  | UnderSelectAddOptions
  | UnderSelectRemoveOptions;

interface RawUnderSelectProcessSuccessResponse {
  data: "";
  code: 0;
  message: string;
}

interface RawUnderSelectProcessFailResponse {
  data: "";
  code: -1;
  message: string;
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

    if (!link) throw new Error(`"link" is required`);
    if (!req.body.classId) throw new Error(`"classId" are required`);

    const referer = `${UNDER_STUDY_SERVER}${link}`;

    if (type === "add") {
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
        if (data.code === -1 && data.message === "当前不是选课时间")
          return res.json({
            success: false,
            msg: data.message,
            type: "not-opened",
          } as CommonFailedResponse);

        return res.json({
          success: false,
          msg: data.message,
        } as AuthLoginFailedResult);
      }

      return res.json({
        success: true,
        msg: data.message,
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
        if (data.code === -1 && data.message === "当前不是选课时间")
          return res.json({
            success: false,
            msg: data.message,
            type: "not-opened",
          } as CommonFailedResponse);

        return res.json({
          success: false,
          msg: data.message,
        } as AuthLoginFailedResult);
      }

      return res.json({
        success: true,
        msg: data.message,
      });
    }

    throw new Error('Invalid "type"');
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      msg: message,
    } as AuthLoginFailedResult);
  }
};
