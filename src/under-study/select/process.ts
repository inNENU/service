import type { AuthLoginFailedResponse } from "../../auth/index.js";
import {
  ActionFailType,
  ExpiredResponse,
  InvalidArgResponse,
  MissingArgResponse,
} from "../../config/index.js";
import type { CommonFailedResponse, LoginOptions } from "../../typings.js";
import { EDGE_USER_AGENT_HEADERS, middleware } from "../../utils/index.js";
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
  | AuthLoginFailedResponse
  | CommonFailedResponse<
      | ActionFailType.Closed
      | ActionFailType.Full
      | ActionFailType.InvalidArg
      | ActionFailType.MissingArg
      | ActionFailType.MissingCredential
    >;

export const underStudyProcessCourseHandler = middleware<
  UnderSelectProcessResponse,
  UnderSelectProcessOptions
>(async (req, res) => {
  const { link, type } = req.body;

  const cookieHeader = req.headers.cookie!;

  if (!link) return res.json(MissingArgResponse("link"));

  if (!req.body.classId) return res.json(MissingArgResponse("classId"));

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
      redirect: "manual",
    });

    if (response.status !== 200) return res.json(ExpiredResponse);

    const data = (await response.json()) as RawUnderSelectProcessResponse;

    if (data.code !== 0) {
      if (data.code === -1) {
        if (data.message === "当前不是选课时间")
          return res.json({
            success: false,
            type: ActionFailType.Closed,
            msg: data.message,
          });

        if (data.message === "选课人数超出，请选其他课程") {
          return res.json({
            success: false,
            type: ActionFailType.Full,
            msg: data.message,
          });
        }
      }

      throw new Error(data.message);
    }

    return res.json({ success: true });
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
      redirect: "manual",
    });

    if (response.status !== 200) return res.json(ExpiredResponse);

    const data = (await response.json()) as RawUnderSelectProcessResponse;

    if (data.code !== 0) {
      if (data.code === -1 && data.message === "当前不是选课时间")
        return res.json({
          success: false,
          msg: data.message,
          type: ActionFailType.Closed,
        });

      throw new Error(data.message);
    }

    return res.json({ success: true });
  }

  return res.json(InvalidArgResponse("type"));
});
