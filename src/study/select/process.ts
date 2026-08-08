import { ActionFailType, expiredResponse, unknownResponse } from "@/config/index.js";
import type { CommonFailedResponse, LoginOptions } from "@/typings.js";
import { EDGE_USER_AGENT_HEADERS } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../../auth/index.js";

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

export type UnderSelectProcessOptions = UnderSelectAddOptions | UnderSelectRemoveOptions;

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
      | ActionFailType.Conflict
      | ActionFailType.InvalidArg
      | ActionFailType.MissingArg
      | ActionFailType.MissingCredential
    >;

export const addSelectCourse = async (
  options: UnderSelectAddOptions,
  cookieHeader: string,
  server: string,
): Promise<UnderSelectProcessResponse> => {
  const page = `${server}${options.link}`;

  const response = await fetch(`${page}/add`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: page,
      ...EDGE_USER_AGENT_HEADERS,
    },
    body: new URLSearchParams({
      kcmc: options.name ?? "",
      kcrwdm: options.classId,
      qz: String(options.weight ?? -1),
      // NOTE: This is an unknown field, and currently can be omitted
      hlct: "0",
    }),
    redirect: "manual",
  });

  if (response.status !== 200) return expiredResponse;

  const data = (await response.json()) as RawUnderSelectProcessResponse;

  if (data.code !== 0) {
    if (data.code === -1) {
      if (data.message === "当前不是选课时间") {
        return {
          success: false,
          type: ActionFailType.Closed,
          msg: data.message,
        };
      }

      if (data.message === "选课人数超出，请选其他课程") {
        return {
          success: false,
          type: ActionFailType.Full,
          msg: data.message,
        };
      }

      if (data.message === "您不在限选范围内") {
        return {
          success: false,
          type: ActionFailType.Forbidden,
          msg: data.message,
        };
      }

      if (data.message.includes("上课时间有冲突")) {
        return {
          success: false,
          type: ActionFailType.Conflict,
          msg: data.message,
        };
      }
    }

    throw new Error(data.message);
  }

  return { success: true };
};

export const removeSelectCourse = async (
  options: UnderSelectRemoveOptions,
  cookieHeader: string,
  server: string,
): Promise<UnderSelectProcessResponse> => {
  const page = `${server}${options.link}`;

  const response = await fetch(`${page}/cancel`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: page,
      ...EDGE_USER_AGENT_HEADERS,
    },
    body: new URLSearchParams({
      jxbdm: options.classCode ?? "",
      kcrwdm: options.classId,
      kcmc: options.name ?? "",
    }),
    redirect: "manual",
  });

  if (response.status !== 200) return expiredResponse;

  const data = (await response.json()) as RawUnderSelectProcessResponse;

  if (data.code !== 0) {
    if (data.code === -1 && data.message === "当前不是选课时间") {
      return {
        success: false,
        msg: data.message,
        type: ActionFailType.Closed,
      };
    }

    console.error("不能识别", data.message);

    return unknownResponse(data.message);
  }

  return { success: true };
};
