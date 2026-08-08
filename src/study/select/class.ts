import type { ActionFailType } from "@/config/index.js";
import { expiredResponse } from "@/config/index.js";
import type { CommonFailedResponse, CommonSuccessResponse, LoginOptions } from "@/typings.js";
import { EDGE_USER_AGENT_HEADERS } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../../auth/index.js";
import type { RawSearchClassResponse, SelectClassInfo } from "./typings.js";
import { getClasses } from "./utils.js";

export interface SelectClassOptions extends LoginOptions {
  /** 选课链接 */
  link: string;
  /** 课程 ID */
  courseId: string;
}

export type SelectClassSuccessResponse = CommonSuccessResponse<SelectClassInfo[]>;

export type SelectClassResponse =
  | SelectClassSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse<ActionFailType.MissingArg>;

export const getSelectClasses = async (
  link: string,
  courseId: string,
  cookieHeader: string,
  server: string,
): Promise<SelectClassResponse> => {
  const infoUrl = `${server}${link}/kxkc`;

  const response = await fetch(infoUrl, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${server}${link}`,
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

  if (response.status !== 200) return expiredResponse;

  const data = (await response.json()) as RawSearchClassResponse;

  return {
    success: true,
    data: getClasses(data.rows),
  };
};
