import type { ActionFailType } from "@/config/index.js";
import { expiredResponse } from "@/config/index.js";
import type { CommonFailedResponse, CommonSuccessResponse, LoginOptions } from "@/typings.js";
import { EDGE_USER_AGENT_HEADERS } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../../auth/index.js";
import type { RawSelectClassItem, SelectClassInfo } from "./typings.js";
import { getClasses } from "./utils.js";

export interface SelectSelectedOptions extends LoginOptions {
  /** 课程分类链接 */
  link: string;
}

interface RawSelectedClassResponse {
  data: "";
  rows: RawSelectClassItem[];
  total: number;
}

interface RawSelectedClassResponse {
  data: "";
  rows: RawSelectClassItem[];
  total: number;
}

export type SelectSelectedSuccessResponse = CommonSuccessResponse<SelectClassInfo[]>;

export type SelectSelectedResponse =
  | SelectSelectedSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse<ActionFailType.MissingArg | ActionFailType.Unknown>;

export const getSelectedCourses = async (
  link: string,
  cookieHeader: string,
  server: string,
): Promise<SelectSelectedResponse> => {
  const infoUrl = `${server}${link}/yxkc`;

  const response = await fetch(infoUrl, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${server}${link}`,
      ...EDGE_USER_AGENT_HEADERS,
    },
    body: new URLSearchParams({
      page: "1",
      row: "1000",
      sort: "kcrwdm",
      order: "asc",
    }),
    redirect: "manual",
  });

  if (response.status !== 200) return expiredResponse;

  const data = (await response.json()) as RawSelectedClassResponse;

  return {
    success: true,
    data: getClasses(data.rows),
  };
};
