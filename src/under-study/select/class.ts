import type { ActionFailType } from "@/config/index.js";
import { ExpiredResponse, MissingArgResponse } from "@/config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  LoginOptions,
} from "@/typings.js";
import { EDGE_USER_AGENT_HEADERS, request } from "@/utils/index.js";

import type {
  RawUnderSearchClassResponse,
  UnderSelectClassInfo,
} from "./typings.js";
import { getClasses } from "./utils.js";
import type { AuthLoginFailedResponse } from "../../auth/index.js";
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
  | CommonFailedResponse<ActionFailType.MissingArg>;

export const getUnderSelectClasses = async (
  link: string,
  courseId: string,
  cookieHeader: string,
): Promise<UnderSelectClassResponse> => {
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

  if (response.status !== 200) return ExpiredResponse;

  const data = (await response.json()) as RawUnderSearchClassResponse;

  return {
    success: true,
    data: getClasses(data.rows),
  };
};

export const underSelectClassHandler = request<
  UnderSelectClassResponse,
  UnderSelectClassOptions
>(async (req, res) => {
  const cookieHeader = req.headers.cookie!;
  const { link, courseId } = req.body;

  if (!link) return res.json(MissingArgResponse("link"));
  if (!courseId) return res.json(MissingArgResponse("courseId"));

  return res.json(await getUnderSelectClasses(link, courseId, cookieHeader));
});
