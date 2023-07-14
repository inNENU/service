import type { RequestHandler } from "express";

import { MAIN_URL } from "./utils.js";
import type { CommonFailedResponse, EmptyObject } from "../typings.js";

const listBodyRegExp = /<tbody>([\s\S]*?)<\/tbody>/;
const totalPageRegExp = /_simple_list_gotopage_fun\((\d+),/;
const pageViewRegExp =
  /\[(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\],"wbnews", (\d+)\)/;
const noticeItemRegExp =
  /<a href="(?:\.\.\/)+([^"]+)"[^>]+>([^<]+)<\/a>\s*<\/h2>\s*<\/td>\s*<td class="news-table-department">\s*<span id="sou1">([^<]*)<\/span>\s*<\/td>\s*<td class="news-table-date">\s+<span>([^<]*)<\/span>/g;
const newsItemRegExp =
  /<a href="(?:\.\.\/)+([^"]+)"[^>]+>([^<]+)<\/a>\s*<\/h2>\s*<\/td>\s*<td class="news-table-department">\s*<span id="sou1">([^<]*)<\/span>\s*<\/td>\s*<td class="news-table-date">\s+<span>([^<]*)<\/span>/g;

export type MainInfoType = "notice" | "news" | "academic";

export interface MainInfoListOptions {
  /** @default 1 */
  page?: number;
  totalPage?: number;
  type: MainInfoType;
}

export interface InfoItem {
  title: string;
  from: string;
  time: string;
  url: string;
  pageView: number;
}

export interface MainInfoListSuccessResponse {
  success: true;
  /** @deprecated */
  status: "success";
  data: InfoItem[];
  page: number;
  totalPage: number;
}

export type MainInfoListResponse =
  | MainInfoListSuccessResponse
  | CommonFailedResponse;

const type2ID = {
  notice: "tzgg",
  news: "dsxw1",
  academic: "xshd1",
};

const totalPageState: Record<string, number> = {};

export const mainInfoListHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  MainInfoListOptions
> = async (req, res) => {
  try {
    const { type, page = 1, totalPage = totalPageState[type] || 0 } = req.body;

    if (!["news", "notice", "academic"].includes(type))
      return res.json(<CommonFailedResponse>{
        success: false,
        status: "failed",
        msg: "type 参数错误",
      });

    if (
      Math.round(page) !== page ||
      page < 1 ||
      (page !== 1 && page > totalPage)
    )
      return res.json(<CommonFailedResponse>{
        success: false,
        status: "failed",
        msg: "page 参数错误",
      });

    const response = await fetch(
      totalPage && page !== 1
        ? `${MAIN_URL}/index/${type2ID[type]}/${totalPage - page}.htm`
        : `${MAIN_URL}/index/${type2ID[type]}.htm`,
    );

    if (response.status !== 200)
      return res.json(<CommonFailedResponse>{
        success: false,
        status: "failed",
        msg: "请求失败",
      });

    const text = await response.text();

    totalPageState[type] = Number(totalPageRegExp.exec(text)![1]);

    const matched = pageViewRegExp.exec(text)!.slice(1).map(Number);

    const owner = matched.pop();

    const pageViewResponse = await fetch(
      `${MAIN_URL}/system/resource/code/news/click/dynclicksbatch.jsp?clickids=${matched.join(
        ",",
      )}&owner=${owner}&clicktype=wbnews`,
    );

    const pageViews = (await pageViewResponse.text()).split(",").map(Number);

    const data = Array.from(
      listBodyRegExp
        .exec(text)![1]
        .matchAll(type === "notice" ? noticeItemRegExp : newsItemRegExp),
    ).map(([, url, title, from, time], index) => ({
      url,
      title,
      from,
      time,
      pageView: pageViews[index],
    }));

    return res.json(<MainInfoListSuccessResponse>{
      success: true,
      status: "success",
      data,
      page,
      totalPage: totalPageState[type],
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<CommonFailedResponse>{
      success: false,
      status: "failed",
      msg: message,
    });
  }
};
