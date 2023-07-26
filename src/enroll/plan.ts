import type { RequestHandler } from "express";

import type { CommonFailedResponse, EmptyObject } from "../typings";

export interface EnrollPlanOptions {
  year: string;
  province: string;
  planType: string;
  majorType: string;
  reformType: string;
}

export interface EnrollPlanInfo {
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

export interface EnrollPlanSuccessResponse {
  success: true;
  data: EnrollPlanInfo[];
}

export type EnrollPlanResponse =
  | EnrollPlanSuccessResponse
  | CommonFailedResponse;

const enrollItemReg =
  /<tr class='RowTr'>\s+<td align='center'>(.*?)<\/td>\s+<td align='center'>(.*?)<\/td>\s+<td align='center'>(.*?)<\/td>\s+<td align='center'>(.*?)<\/td>\s+<td align='center'>(.*?)<\/td>\s+<td align='center'>(.*?)<\/td>\s*<td align='center'>(.*?)<\/td>\s*<\/tr>/g;

const ENROLL_PLAN_URL =
  "http://bkzsw.nenu.edu.cn/col_000018_000171_action_Enrollment.html";

export const enrollPlanHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  EnrollPlanOptions
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

    const searchResponse = await fetch(ENROLL_PLAN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (searchResponse.status === 404)
      return res.json(<CommonFailedResponse>{
        success: false,
        msg: "招生工作已结束，此功能暂不开放",
      });

    const content = await searchResponse.text();

    const planInfo: EnrollPlanInfo[] = [];
    let planMatch;

    while ((planMatch = enrollItemReg.exec(content))) {
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

    return res.json(<EnrollPlanSuccessResponse>{
      success: true,
      data: planInfo,
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<CommonFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
