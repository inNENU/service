import type { RequestHandler } from "express";

import type {
  RawUnderSearchClassResponse,
  UnderSelectClassInfo,
} from "./typings.js";
import { getClasses } from "./utils.js";
import type { AuthLoginFailedResponse } from "../../auth/index.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../../typings.js";
import { EDGE_USER_AGENT_HEADERS } from "../../utils/index.js";
import { underStudyLogin } from "../login.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

export interface UnderSelectClassOptions extends LoginOptions {
  /** 选课链接 */
  link: string;
  /** 课程 ID */
  courseId: string;
}

export interface UnderSelectClassSuccessResponse {
  success: true;
  data: UnderSelectClassInfo[];
}

export type UnderSelectClassResponse =
  | UnderSelectClassSuccessResponse
  | AuthLoginFailedResponse
  | (CommonFailedResponse & { type: "not-initialized" });

export const underStudySearchClassHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderSelectClassOptions
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

    const { courseId, link } = req.body;

    if (!link) throw new Error(`"link" is required!`);
    if (!courseId) throw new Error(`"courseId" is required!`);

    const infoUrl = `${UNDER_STUDY_SERVER}${link}/kxkc`;

    const response = await fetch(infoUrl, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: cookieHeader,
        Referer: `${UNDER_STUDY_SERVER}${link}`,
        ...EDGE_USER_AGENT_HEADERS,
      },
      body: new URLSearchParams({
        kcptdm: courseId,
        page: "1",
        row: "1000",
        sort: "kcrwdm",
        order: "asc",
      }),
    });

    const data = (await response.json()) as RawUnderSearchClassResponse;

    return res.json({
      success: true,
      data: getClasses(data.rows),
    } as UnderSelectClassSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      msg: message,
    } as AuthLoginFailedResponse);
  }
};
