import type { RequestHandler } from "express";

import { underStudyLogin } from "./login.js";
import { UNDER_STUDY_SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/index.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { EDGE_USER_AGENT_HEADERS } from "../utils/index.js";

export interface UnderGradeDetailOptions extends Partial<LoginOptions> {
  /** 成绩代码 */
  gradeCode: string;
}

export interface UnderScoreDetail {
  /** 名称 */
  name: string;
  /** 分数 */
  score: number;
  /** 百分比 */
  percent: number;
}

interface RawUnderGradeDetailItem {
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

interface RawUnderGradeSuccessResult {
  code: 0;
  data: RawUnderGradeDetailItem[];
  message: string;
}

interface RawUnderGradeFailedResult {
  code: number;
  data: unknown;
  message: string;
}

type RawUnderGradeResult =
  | RawUnderGradeSuccessResult
  | RawUnderGradeFailedResult;

export interface UnderGradeDetailSuccessResponse {
  success: true;
  data: UnderScoreDetail[];
}

export type UnderGradeDetailResponse =
  | UnderGradeDetailSuccessResponse
  | AuthLoginFailedResult
  | CommonFailedResponse;

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
}: RawUnderGradeDetailItem): UnderScoreDetail[] => {
  const results: UnderScoreDetail[] = [];

  if (bl1 > 0) results.push({ name: bl1mc, score: Number(cj1), percent: bl1 });
  if (bl2 > 0) results.push({ name: bl2mc, score: Number(cj2), percent: bl2 });
  if (bl3 > 0) results.push({ name: bl3mc, score: Number(cj3), percent: bl3 });
  if (bl4 > 0) results.push({ name: bl4mc, score: Number(cj4), percent: bl4 });
  if (bl5 > 0) results.push({ name: bl5mc, score: Number(cj5), percent: bl5 });

  return results;
};

export const underStudyGradeDetailHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderGradeDetailOptions
> = async (req, res) => {
  try {
    const { gradeCode } = req.body;
    let cookieHeader = req.headers.cookie;

    if (!gradeCode)
      return res.json(<CommonFailedResponse>{
        success: false,
        msg: "请提供课程代码",
      });

    const queryUrl = `${UNDER_STUDY_SERVER}/new/student/xskccj/getDetail?cjdm=${gradeCode}`;

    if (!cookieHeader) {
      if (!req.body.id || !req.body.password)
        return res.json(<CommonFailedResponse>{
          success: false,
          msg: "请提供账号密码",
        });

      const result = await underStudyLogin(<LoginOptions>req.body);

      if (!result.success) return res.json(result);
      cookieHeader = result.cookieStore.getHeader(queryUrl);
    }

    const response = await fetch(queryUrl, {
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: cookieHeader,
        Referer: `${UNDER_STUDY_SERVER}/new/student/xskccj/kccjList.page`,
        ...EDGE_USER_AGENT_HEADERS,
      },
    });

    if (response.headers.get("content-type")?.includes("text/html"))
      return res.json({
        success: false,
        type: LoginFailType.Expired,
        msg: "登录过期，请重新登录",
      });

    const data = <RawUnderGradeResult>await response.json();

    if (data.code === 0) {
      const gradeDetail = getGradeDetail(
        (<RawUnderGradeDetailItem[]>data.data)[0],
      );

      return res.json(<UnderGradeDetailSuccessResponse>{
        success: true,
        data: gradeDetail,
      });
    }

    if (data.message === "尚未登录，请先登录")
      return {
        success: false,
        type: LoginFailType.Expired,
        msg: "登录过期，请重新登录",
      };

    return {
      success: false,
      msg: data.message,
    };
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};
