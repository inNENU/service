import type { RequestHandler } from "express";

export interface HistoryGradeOptions {
  year: string;
  province: string;
  planType: string;
  majorType: string;
  reformType: string;
}

export interface HistoryGradeInfo {
  /** 专业名称 */
  major: string;
  /** 专业属性 */
  majorType: string;
  /** 重点线 */
  line: string;
  /** 最低分 */
  min: string;
  /** 最高分 */
  max: string;
  /** 平均分 */
  average: string;
  /** 备注 */
  remark: string;
}

export interface EnrollGradeSuccessResponse {
  status: "success";
  data: HistoryGradeInfo[];
}

export interface EnrollGradeFailedResponse {
  status: "failed";
  msg: string;
}

export type EnrollGradeResponse =
  | EnrollGradeSuccessResponse
  | EnrollGradeFailedResponse;

const enrollGradeItemReg =
  /<tr class="RowTr">\s+<td align="center">(.*?)<\/td>\s+<td align="center">(.*?)<\/td>\s+<td align="center">(.*?)<\/td>\s+<td align="center">(.*?)<\/td>\s+<td align="center">(.*?)<\/td>\s+<td align="center">(.*?)<\/td>\s*<!--\s+-->\s+<td align="center">(.*?)<\/td>\s*<\/tr>/g;

export const historyGradeHandler: RequestHandler = async (req, res) => {
  try {
    const body = <HistoryGradeOptions>req.body;

    const url =
      "http://bkzsw.nenu.edu.cn//col_000018_000170_action_Fraction.html";
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

    const historyInfo: HistoryGradeInfo[] = [];
    let historyMatch;

    while ((historyMatch = enrollGradeItemReg.exec(content))) {
      const [, major, majorType, line, min, max, average, remark] =
        historyMatch;

      historyInfo.push({
        major,
        majorType,
        line,
        min,
        max,
        average,
        remark: remark.replace(/&nbsp;/g, " ").trim(),
      });
    }

    console.log("Getting", historyInfo);

    return res.json(<EnrollGradeSuccessResponse>{
      status: "success",
      data: historyInfo,
    });
  } catch (err) {
    res.json(<EnrollGradeFailedResponse>{
      status: "failed",
      msg: (<Error>err).message,
      details: (<Error>err).stack,
    });
  }
};
