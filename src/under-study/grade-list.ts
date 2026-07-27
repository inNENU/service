import { EDGE_USER_AGENT_HEADERS, request } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../auth/index.js";
import { expiredResponse, unknownResponse } from "../config/index.js";
import type { LoginOptions } from "../typings.js";
import type { RawUnderGradeResult, UnderGradeListSuccessResponse } from "./grade-parser.js";
import { TEST_UNDER_GRADE_LIST_RESPONSE, getGradeLists } from "./grade-parser.js";
import { UNDER_STUDY_SERVER } from "./utils.js";

export interface UnderGradeListOptions extends LoginOptions {
  /** 查询时间 */
  time?: string;
}

export type UnderGradeListResponse = UnderGradeListSuccessResponse | AuthLoginFailedResponse;

const QUERY_URL = `${UNDER_STUDY_SERVER}/new/student/xskccj/kccjDatas`;

export const getUnderGradeList = async (
  cookieHeader: string,
  time: string,
): Promise<UnderGradeListResponse> => {
  const response = await fetch(QUERY_URL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${UNDER_STUDY_SERVER}/new/student/xskccj/kccjList.page`,
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

  const data = (await response.json()) as RawUnderGradeResult;

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

export const underStudyGradeListHandler = request<UnderGradeListResponse, UnderGradeListOptions>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(TEST_UNDER_GRADE_LIST_RESPONSE);

    return res.json(await getUnderGradeList(cookieHeader, req.body.time ?? ""));
  },
);
