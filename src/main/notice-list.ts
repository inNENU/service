import type { RequestHandler } from "express";

import { MAIN_URL, getPageView } from "./utils.js";
import type { CommonFailedResponse, EmptyObject } from "../typings.js";

const totalItemsRegExp = /<span class="p_t">共(\d+)条<\/span>/;
const pageViewRegExp =
  /_showDynClickBatch\(\[[^\]]+\],\s*\[([^\]]+)\],\s*"wbnews",\s*(\d+)\)/;
const noticeItemRegExp =
  /data-aos="fade-up">\s*<a href="([^"]+)"[^>]+>\s+<div class="time">\s+<h3>(.*?)\.(.*?)<\/h3>\s*<h6>(.*?)<\/h6>\s*<\/div>\s*<div[^>]*>\s*<h4[^>]*>(.*)<\/h4>\s+<h6>(.*?)<span>/g;

export interface MainNoticeListOptions {
  page?: number;
  totalPage?: number;
}

export interface NoticeInfoItem {
  /** 标题 */
  title: string;
  /** 时间 */
  time: string;
  /** 访问量 */
  pageView: number;
  /** 来源 */
  from: string;
  /** 地址 */
  url: string;
}

export interface MainNoticeListSuccessResponse {
  success: true;
  data: NoticeInfoItem[];
  page: number;
  totalPage: number;
}

export type MainNoticeListResponse =
  | MainNoticeListSuccessResponse
  | CommonFailedResponse;

let totalPageState = 0;

export const mainNoticeListHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  MainNoticeListOptions
> = async (req, res) => {
  try {
    const { page = 1, totalPage = totalPageState } = req.body;

    const response = await fetch(
      totalPage && page !== 1
        ? `${MAIN_URL}/tzgg/${totalPage - page + 1}.htm`
        : `${MAIN_URL}/tzgg.htm`,
    );

    if (response.status !== 200)
      return res.json(<CommonFailedResponse>{
        success: false,
        msg: "请求失败",
      });

    const text = await response.text();

    totalPageState = Math.ceil(Number(totalItemsRegExp.exec(text)![1]) / 10);

    const [, pageIds, owner] = pageViewRegExp.exec(text)!;

    const pageViews = await Promise.all(
      pageIds.split(/,\s*/).map((id) => getPageView(id, owner)),
    );

    const data = Array.from(text.matchAll(noticeItemRegExp)).map(
      ([, url, month, date, year, title, from], index) => ({
        title,
        time: `${year}-${month}-${date}`,
        pageView: pageViews[index],
        from,
        url,
      }),
    );

    return res.json(<MainNoticeListSuccessResponse>{
      success: true,
      data,
      page,
      totalPage: totalPageState,
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
