import { EDGE_USER_AGENT_HEADERS } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../auth/index.js";
import { expiredResponse, unknownResponse } from "../config/index.js";
import type { LoginOptions } from "../typings.js";
import type { RawGradeResult, GradeListSuccessResponse } from "./grade-parser.js";
import { getGradeLists } from "./grade-parser.js";

export interface GradeListOptions extends LoginOptions {
  /** 查询时间 */
  time?: string;
}

export type GradeListResponse = GradeListSuccessResponse | AuthLoginFailedResponse;

export const getGradeList = async (
  cookieHeader: string,
  time: string,
  server: string,
): Promise<GradeListResponse> => {
  const response = await fetch(`${server}/new/student/xskccj/kccjDatas`, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${server}/new/student/xskccj/kccjList.page`,
      ...EDGE_USER_AGENT_HEADERS,
    },
    body: new URLSearchParams({
      xnxqdm: time,
      source: "kccjlist",
      primarySort: "cjdm desc",
      page: "1",
      rows: "150",
      sort: "kcmc",
      order: "asc",
    }),
  });

  if (response.headers.get("Content-Type")?.includes("text/html")) return expiredResponse;

  const data = (await response.json()) as RawGradeResult;

  if ("code" in data) {
    if (data.message === "尚未登录，请先登录") return expiredResponse;

    return unknownResponse(data.message);
  }

  const gradeList = getGradeLists(data.rows);

  return {
    success: true,
    data: gradeList,
  };
};
