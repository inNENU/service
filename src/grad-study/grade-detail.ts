import { EDGE_USER_AGENT_HEADERS, request } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../auth/index.js";
import { expiredResponse, unknownResponse } from "../config/index.js";
import type { CommonSuccessResponse, LoginOptions } from "../typings.js";
import { GRAD_STUDY_SERVER } from "./utils.js";

export interface GradGradeDetailOptions extends LoginOptions {
  /** 成绩代码 */
  gradeCode: string;
}

export interface GradScoreDetail {
  /** 名称 */
  name: string;
  /** 分数 */
  score: number;
  /** 百分比 */
  percent: number;
}

interface RawGradGradeDetailItem {
  /** 总成绩 */
  zcj: string;

  /** 成绩 1 百分比 */
  bl1: number;
  /** 成绩 2 百分比 */
  bl2: number;
  /** 成绩 3 百分比 */
  bl3: number;
  /** 成绩 4 百分比 */
  bl4: number;
  /** 成绩 5 百分比 */
  bl5: number;

  /** 成绩 1 名称 */
  bl1mc: string;
  /** 成绩 2 名称 */
  bl2mc: string;
  /** 成绩 3 名称 */
  bl3mc: string;
  /** 成绩 4 名称 */
  bl4mc: string;
  /** 成绩 5 名称 */
  bl5mc: string;

  /** 成绩 1 */
  cj1: number | "";
  /** 成绩 2 */
  cj2: number | "";
  /** 成绩 3 */
  cj3: number | "";
  /** 成绩 4 */
  cj4: number | "";
  /** 成绩 5 */
  cj5: number | "";

  /** 开课单位 */
  kkbmmc: string;

  kkjysmc: "";
  isrk: "";
}

interface RawGradGradeSuccessResult {
  code: 0;
  data: RawGradGradeDetailItem[];
  message: string;
}

interface RawGradGradeFailResult {
  code: Exclude<number, 0>;
  data: unknown;
  message: string;
}

type RawGradGradeResult = RawGradGradeSuccessResult | RawGradGradeFailResult;

const getGradeDetail = ({
  cj1,
  cj2,
  cj3,
  cj4,
  cj5,
  bl1,
  bl2,
  bl3,
  bl4,
  bl5,
  bl1mc,
  bl2mc,
  bl3mc,
  bl4mc,
  bl5mc,
}: RawGradGradeDetailItem): GradScoreDetail[] => {
  const results: GradScoreDetail[] = [];

  if (bl1 > 0) results.push({ name: bl1mc, score: Number(cj1), percent: bl1 });
  if (bl2 > 0) results.push({ name: bl2mc, score: Number(cj2), percent: bl2 });
  if (bl3 > 0) results.push({ name: bl3mc, score: Number(cj3), percent: bl3 });
  if (bl4 > 0) results.push({ name: bl4mc, score: Number(cj4), percent: bl4 });
  if (bl5 > 0) results.push({ name: bl5mc, score: Number(cj5), percent: bl5 });

  return results;
};

export type GradGradeDetailSuccessResponse = CommonSuccessResponse<GradScoreDetail[]>;

export type GradGradeDetailResponse = GradGradeDetailSuccessResponse | AuthLoginFailedResponse;

const GRAD_GRADE_DETAIL_RESPONSE: GradGradeDetailSuccessResponse = {
  success: true,
  data: [
    {
      name: "平时成绩",
      score: 80,
      percent: 20,
    },
    {
      name: "期末成绩",
      score: 90,
      percent: 80,
    },
  ],
};

export const getGradGradeDetail = async (
  cookieHeader: string,
  gradeCode: string,
): Promise<GradGradeDetailResponse> => {
  const queryUrl = `${GRAD_STUDY_SERVER}/new/student/xskccj/getDetail?cjdm=${gradeCode}`;

  const response = await fetch(queryUrl, {
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${GRAD_STUDY_SERVER}/new/student/xskccj/kccjList.page`,
      ...EDGE_USER_AGENT_HEADERS,
    },
  });

  if (response.headers.get("Content-Type")?.includes("text/html")) return expiredResponse;

  const data = (await response.json()) as RawGradGradeResult;

  if (data.code !== 0) {
    if (data.message === "尚未登录，请先登录") return expiredResponse;

    return unknownResponse(data.message);
  }

  const gradeDetail = getGradeDetail((data.data as RawGradGradeDetailItem[])[0]);

  return {
    success: true,
    data: gradeDetail,
  };
};

export const gradGradeDetailHandler = request<GradGradeDetailResponse, GradGradeDetailOptions>(
  async (req, res) => {
    const { gradeCode } = req.body;
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(GRAD_GRADE_DETAIL_RESPONSE);

    return res.json(await getGradGradeDetail(cookieHeader, gradeCode));
  },
);
