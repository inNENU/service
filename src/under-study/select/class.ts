import type { RequestHandler } from "express";

import type {
  RawUnderSearchClassResponse,
  UnderSelectClassInfo,
} from "./typings.js";
import { getClasses } from "./utils.js";
import type { AuthLoginFailedResponse } from "../../auth/index.js";
import {
  ExpiredResponse,
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

export interface UnderSelectClassOptions extends LoginOptions {
  /** 选课链接 */
  link: string;
  /** 课程 ID */
  courseId: string;
}

export type UnderSelectClassSuccessResponse = CommonSuccessResponse<
  UnderSelectClassInfo[]
>;

export type UnderSelectClassResponse =
  | UnderSelectClassSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse;

export const underStudySearchClassHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderSelectClassOptions
> = async (req, res) => {
  try {
    const { id, password, authToken, link, courseId } = req.body;

    if (id && password && authToken) {
      const result = await underStudyLogin({ id, password, authToken });

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(UNDER_STUDY_SERVER);
    } else if (!req.headers.cookie) {
      return res.json(MissingCredentialResponse);
    }

    const cookieHeader = req.headers.cookie;

    if (!link) return res.json(MissingArgResponse("link"));
    if (!courseId) return res.json(MissingArgResponse("courseId"));

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
      redirect: "manual",
    });

    if (response.status !== 200) return res.json(ExpiredResponse);

    const data = (await response.json()) as RawUnderSearchClassResponse;

    return res.json({
      success: true,
      data: getClasses(data.rows),
    } as UnderSelectClassSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
