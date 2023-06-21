import type { RequestHandler } from "express";

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
  status: "success";
  data: EnrollPlanInfo[];
}

export interface EnrollPlanFailedResponse {
  status: "failed";
  msg: string;
}

export type EnrollPlanResponse =
  | EnrollPlanSuccessResponse
  | EnrollPlanFailedResponse;

const enrollItemReg =
  /<tr class='RowTr'>\s+<td align='center'>(.*?)<\/td>\s+<td align='center'>(.*?)<\/td>\s+<td align='center'>(.*?)<\/td>\s+<td align='center'>(.*?)<\/td>\s+<td align='center'>(.*?)<\/td>\s+<td align='center'>(.*?)<\/td>\s*<td align='center'>(.*?)<\/td>\s*<\/tr>/g;

export const enrollPlanHandler: RequestHandler = async (req, res) => {
  try {
    const body = <EnrollPlanOptions>req.body;

    const url =
      "http://bkzsw.nenu.edu.cn/col_000018_000171_action_Enrollment.html";
    const params = new URLSearchParams({
      nianfen: body.year,
      shengfen: body.province,
      jhlb: body.planType,
      zylb: body.majorType,
      kelei: body.reformType,
    }).toString();

    console.log("Requesting enroll plan with params:", params);

    const searchResponse = await fetch(`${url}`, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/x-www-form-urlencoded",
      }),
      body: params,
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

    console.log("Getting", planInfo);

    return res.json(<EnrollPlanSuccessResponse>{
      status: "success",
      data: planInfo,
    });
  } catch (err) {
    res.json(<EnrollPlanFailedResponse>{
      status: "failed",
      msg: (<Error>err).message,
      details: (<Error>err).stack,
    });
  }
};
