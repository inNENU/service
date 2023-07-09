import type { RequestHandler } from "express";

import type { EmptyObject } from "../typings";

export interface HistoryGradeOptions {
  year: string;
  province: string;
  planType: string;
  majorType: string;
  reformType: string;
}

export type HistoryGradeInfoItem = string[];

export interface HistoryGradeResult {
  titles: string[];
  items: HistoryGradeInfoItem[];
}

export interface EnrollGradeSuccessResponse {
  status: "success";
  data: HistoryGradeResult;
}

export interface EnrollGradeFailedResponse {
  status: "failed";
  msg: string;
}

export type EnrollGradeResponse =
  | EnrollGradeSuccessResponse
  | EnrollGradeFailedResponse;

const enrollGradeTitleReg =
  /<tr class="RowTr"\s+bgcolor="#f5f5f5">([\s\S]+?)<\/tr>/g;

const enrollGradeTitleItemReg =
  /<td align="center".*?><strong>(.*?)<\/strong><\/td>/g;

const enrollGradeItemReg = /<tr class="RowTr">([\s\S]+?)<\/tr>/g;

const enrollGradeItemInfoReg = /<td align="center">(.*?)<\/td>/g;

const HISTORY_GRADE_URL =
  "http://bkzsw.nenu.edu.cn//col_000018_000170_action_Fraction.html";

export const historyGradeHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  HistoryGradeOptions
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

    console.log("Requesting history grade with params:", params);

    const searchResponse = await fetch(HISTORY_GRADE_URL, {
      method: "POST",
      headers: new Headers({
        "Content-Type": "application/x-www-form-urlencoded",
      }),
      body: params,
    });

    const content = (await searchResponse.text()).split("WeishilgBt")[1];

    const titleText = enrollGradeTitleReg
      .exec(content)?.[1]
      .replace(/<!--[\s\S]*?-->/g, () => "");

    if (titleText) {
      const titles: string[] = [];

      let titleMatch;

      while ((titleMatch = enrollGradeTitleItemReg.exec(titleText)))
        titles.push(titleMatch[1]);

      const historyInfos: HistoryGradeInfoItem[] = [];
      let historyMatch;

      while ((historyMatch = enrollGradeItemReg.exec(content))) {
        const enrollItems = historyMatch[1].replace(
          /<!--[\s\S]*?-->/g,
          () => "",
        );

        const historyInfo: HistoryGradeInfoItem = [];

        let enrollItemMatch;

        while ((enrollItemMatch = enrollGradeItemInfoReg.exec(enrollItems)))
          historyInfo.push(enrollItemMatch[1].replace(/&nbsp;/g, " ").trim());

        if (historyInfo.length > 0) historyInfos.push(historyInfo);
      }

      console.log(`Getting ${historyInfos.length} items`);

      return res.json(<EnrollGradeSuccessResponse>{
        status: "success",
        data: { titles, items: historyInfos },
      });
    }

    return res.json(<EnrollGradeFailedResponse>{
      status: "failed",
      msg: "获取数据失败，请重试",
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<EnrollGradeFailedResponse>{
      status: "failed",
      msg: message,
    });
  }
};
