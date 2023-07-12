import type { RequestHandler } from "express";

import type { CommonFailedResponse, EmptyObject } from "../typings.js";

const bodyRegExp = /<tbody>([\s\S]*?)<\/tbody>/;
const totalPageRegExp = /_simple_list_gotopage_fun\((\d+),/;
const pageViewsRegExp =
  /\[(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\],"wbnews", /;
const noticeItemRegExp =
  /<a href="(?:\.\.\/)+([^"]+)"[^>]+>([^>]+)<\/a>\s*<\/h2>\s*<\/td>\s*<td class="news-table-department">\s*<span id="sou1">([^>]*)<\/span>\s*<\/td>\s*<td class="news-table-date">\s+<span>([^>]*)<\/span>/g;
const newsItemRegExp =
  /<a href="(?:\.\.\/)+([^"]+)"[^>]+>([^>]+)<\/a>\s*<\/h2>\s*<\/td>\s*<td class="news-table-department">\s*<span id="sou1">([^>]*)<\/span>\s*<\/td>\s*<td class="news-table-date">\s+<span>([^>]*)<\/span>/g;

export interface MainInfoOptions {
  /** @default 1 */
  page?: number;
  totalPage?: number;
  type: "notice" | "news" | "academic";
}

export interface InfoItem {
  title: string;
  from: string;
  time: string;
  url: string;
  pageViews: number;
}

export interface MainInfoSuccessResponse {
  success: true;
  /** @deprecated */
  status: "success";
  data: InfoItem[];
  page: number;
  totalPage: number;
}

export type MainInfoResponse = MainInfoSuccessResponse | CommonFailedResponse;

const type2ID = {
  notice: "tzgg",
  news: "dsxw1",
  academic: "xshd1",
};

const totalPageState: Record<string, number> = {};

export const mainInfoHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  MainInfoOptions
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
        ? `https://www.nenu.edu.cn/index/${type2ID[type]}/${
            totalPage - page
          }.htm`
        : `https://www.nenu.edu.cn/index/${type2ID[type]}.htm`,
    );

    if (response.status !== 200)
      return res.json(<CommonFailedResponse>{
        success: false,
        status: "failed",
        msg: "请求失败",
      });

    const text = await response.text();

    totalPageState[type] = Number(totalPageRegExp.exec(text)![1]);

    const pageViews = pageViewsRegExp.exec(text)!.slice(1).map(Number);
    const data = Array.from(
      bodyRegExp
        .exec(text)![1]
        .matchAll(type === "notice" ? noticeItemRegExp : newsItemRegExp),
    ).map(([, url, title, from, time], index) => ({
      url,
      title,
      from,
      time,
      pageViews: pageViews[index],
    }));

    return res.json(<MainInfoSuccessResponse>{
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
