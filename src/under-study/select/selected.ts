import type { RequestHandler } from "express";

import type {
  RawUnderSelectClassItem,
  UnderSelectClassInfo,
} from "./typings.js";
import { getClasses } from "./utils.js";
import type { AuthLoginFailedResponse } from "../../auth/index.js";
import type { ActionFailType } from "../../config/actionFailType.js";
import {
  MissingArgResponse,
  MissingCredentialResponse,
  UnknownResponse,
} from "../../config/response.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  EmptyObject,
  LoginOptions,
} from "../../typings.js";
import { EDGE_USER_AGENT_HEADERS } from "../../utils/index.js";
import { underStudyLogin } from "../login.js";
import { UNDER_STUDY_SERVER } from "../utils.js";

export interface UnderSelectSelectedOptions extends LoginOptions {
  /** 课程分类链接 */
  link: string;
}

interface RawUnderSelectedClassResponse {
  data: "";
  rows: RawUnderSelectClassItem[];
  total: number;
}

interface RawUnderSelectedClassResponse {
  data: "";
  rows: RawUnderSelectClassItem[];
  total: number;
}

export type UnderSelectSelectedSuccessResponse = CommonSuccessResponse<
  UnderSelectClassInfo[]
>;

export type UnderSelectSelectedResponse =
  | UnderSelectSelectedSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse<ActionFailType.Unknown>;

export const underStudySelectedCourseHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderSelectSelectedOptions
> = async (req, res) => {
  try {
    const { id, password, link } = req.body;

    if (id && password) {
      const result = await underStudyLogin({ id, password });

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(UNDER_STUDY_SERVER);
    } else if (!req.headers.cookie) {
      return res.json(MissingCredentialResponse);
    }

    if (!link) return res.json(MissingArgResponse("link"));

    const infoUrl = `${UNDER_STUDY_SERVER}${link}/yxkc`;

    const response = await fetch(infoUrl, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: req.headers.cookie,
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
      data: getClasses(data.rows),
    } as UnderSelectSelectedSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
