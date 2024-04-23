import type { RequestHandler } from "express";

import type { CommonFailedResponse, EmptyObject } from "../typings";

export interface UnderEnrollPlanOptions {
  year: string;
  province: string;
  planType: string;
  majorType: string;
  reformType: string;
}

export interface UnderEnrollPlanInfo {
  /** 专业名称 */
  major: string;
  /** 专业属性 */
  majorType: string;
  /** 科类 */
  planType: string;
  /** 招生人数 */
  count: string;
  /** 学费 */
  year: string;
  /** 学费 */
  fee: string;
  /** 备注 */
  remark: string;
}

export interface UnderEnrollPlanSuccessResponse {
  success: true;
  data: UnderEnrollPlanInfo[];
}

export type UnderEnrollPlanResponse =
  | UnderEnrollPlanSuccessResponse
  | CommonFailedResponse;

const underEnrollItemReg =
  /<tr class='RowTr'>\s+<td align='center'>(.*?)<\/td>\s+<td align='center'>(.*?)<\/td>\s+<td align='center'>(.*?)<\/td>\s+<td align='center'>(.*?)<\/td>\s+<td align='center'>(.*?)<\/td>\s+<td align='center'>(.*?)<\/td>\s*<td align='center'>(.*?)<\/td>\s*<\/tr>/g;

const UNDER_ENROLL_PLAN_URL =
  "http://bkzsw.nenu.edu.cn/col_000018_000171_action_Enrollment.html";

export const underEnrollPlanHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderEnrollPlanOptions
> = async (req, res) => {
  try {
    const { majorType, planType, province, reformType, year } = req.body;

    const options = {
      nianfen: year,
      shengfen: province,
      jhlb: planType,
      zylb: majorType,
      kelei: reformType,
    };

    const params = new URLSearchParams(options).toString();

    console.log("Requesting enroll plan with params:", params);

    const searchResponse = await fetch(UNDER_ENROLL_PLAN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (searchResponse.status === 404)
      return res.json({
        success: false,
        msg: "招生工作已结束，此功能暂不开放",
      } as CommonFailedResponse);

    const content = await searchResponse.text();

    const planInfo: UnderEnrollPlanInfo[] = [];
    let planMatch;

    while ((planMatch = underEnrollItemReg.exec(content))) {
      const [, major, majorType, planType, count, year, fee, remark] =
        planMatch;

      planInfo.push({
        major,
        majorType,
        planType,
        count,
        year,
        fee,
        remark: remark.replace(/&nbsp;/g, " ").trim(),
      });
    }

    console.log(`Getting ${planInfo.length} items`);

    return res.json({
      success: true,
      data: planInfo,
    } as UnderEnrollPlanSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);
    res.json({
      success: false,
      msg: message,
    } as CommonFailedResponse);
  }
};
