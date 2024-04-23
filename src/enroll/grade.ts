import type { RequestHandler } from "express";

import type { CommonFailedResponse, EmptyObject } from "../typings.js";

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
  success: true;
  data: HistoryGradeResult;
}

export type EnrollGradeResponse =
  | EnrollGradeSuccessResponse
  | CommonFailedResponse;

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

      return res.json({
        success: true,
        data: { titles, items: historyInfos },
      } as EnrollGradeSuccessResponse);
    }

    return res.json({
      success: false,
      msg: "获取数据失败，请重试",
    } as CommonFailedResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);
    res.json({
      success: false,
      msg: message,
    } as CommonFailedResponse);
  }
};
