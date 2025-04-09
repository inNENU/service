import type { ActionFailType } from "@/config/index.js";
import { ExpiredResponse, MissingArgResponse } from "@/config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  LoginOptions,
} from "@/typings.js";
import { EDGE_USER_AGENT_HEADERS, request } from "@/utils/index.js";

import type {
  RawUnderSelectClassItem,
  UnderSelectClassInfo,
} from "./typings.js";
import { getClasses } from "./utils.js";
import type { AuthLoginFailedResponse } from "../../auth/index.js";
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
  | CommonFailedResponse<ActionFailType.MissingArg | ActionFailType.Unknown>;

export const getUnderSelectSelectedCourse = async (
  link: string,
  cookieHeader: string,
): Promise<UnderSelectSelectedResponse> => {
  const infoUrl = `${UNDER_STUDY_SERVER}${link}/yxkc`;

  const response = await fetch(infoUrl, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${UNDER_STUDY_SERVER}${link}`,
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

  if (response.status !== 200) return ExpiredResponse;

  const data = (await response.json()) as RawUnderSelectedClassResponse;

  return {
    success: true,
    data: getClasses(data.rows),
  };
};

export const underSelectSelectedCourseHandler = request<
  UnderSelectSelectedResponse,
  UnderSelectSelectedOptions
>(async (req, res) => {
  const { link } = req.body;
  const cookieHeader = req.headers.cookie!;

  if (!link) return res.json(MissingArgResponse("link"));

  return res.json(await getUnderSelectSelectedCourse(link, cookieHeader));
});
