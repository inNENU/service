import type { RequestHandler } from "express";

import { MAIN_URL } from "./utils.js";
import type { CommonFailedResponse, EmptyObject } from "../typings.js";

const listBodyRegExp = /<ul class=".*? dsyw">([\s\S]+?)<\/ul>/;
const totalItemsRegExp = /<span class="p_t">共(\d+)条<\/span>/;
const pageViewRegExp =
  /_showDynClickBatch\(\[[^\]]+\],\s*\[([^\]]+)\],\s*"wbnews",\s*(\d+)\)/;
const researchItemRegExp =
  /data-aos="fade-up">\s*<a href="(?:\.\.\/)+([^"]+)"[^>]+>\s+<div[^>]*>\s+<div class="time">\s+<h3>(.*?)\.(.*?)<\/h3>\s*<h6>(.*?)<\/h6>\s*<\/div>\s*<\/div>\s*<div class="rr">\s*<h4[^>]*>(.*)<\/h4>\s+<p[^>]*>\s*([^<]*?)\s*<\/p>\s*<\/div>\s*(?:<div class="img slow imgBox">[\s\S]*?src="(.*?)"[\s\S]+?)?<\/a>/g;

export type MainInfoType = "social" | "science" | "news" | "media";

export interface MainInfoListOptions {
  type: MainInfoType;
  page?: number;
  totalPage?: number;
}

export interface MainInfoInfoItem {
  /** 标题 */
  title: string;
  /** 时间 */
  time: string;
  /** 访问量 */
  pageView: number;
  /** 描述 */
  description: string;
  /** 封面 */
  cover?: string;
  /** 地址 */
  url: string;
}

export interface MainInfoListSuccessResponse {
  success: true;
  data: MainInfoInfoItem[];
  page: number;
  totalPage: number;
}

export type MainInfoListResponse =
  | MainInfoListSuccessResponse
  | CommonFailedResponse;

const type2ID = {
  social: "xsyj/rwsk",
  science: "xsyj/zrkx",
  news: "dsyw/ywsd",
  media: "dsyw/mtsd",
};

const totalPageState: Record<string, number> = {};

export const mainInfoListHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  MainInfoListOptions
> = async (req, res) => {
  try {
    const { type, page = 1, totalPage = totalPageState[type] || 0 } = req.body;

    if (!["social", "science", "news", "media"].includes(type))
      return res.json(<CommonFailedResponse>{
        success: false,
        msg: "type 参数错误",
      });

    const response = await fetch(
      totalPage && page !== 1
        ? `${MAIN_URL}/${type2ID[type]}/${totalPage - page + 1}.htm`
        : `${MAIN_URL}/${type2ID[type]}.htm`,
    );

    if (response.status !== 200)
      return res.json(<CommonFailedResponse>{
        success: false,
        msg: "请求失败",
      });

    const text = await response.text();

    totalPageState[type] = Math.ceil(
      Number(totalItemsRegExp.exec(text)![1]) / 10,
    );

    const [, pageIds, owner] = pageViewRegExp.exec(text)!;

    const pageViews = await Promise.all(
      pageIds.split(/,\s*/).map((id) =>
        fetch(
          `${MAIN_URL}/system/resource/code/news/click/dynclicks.jsp?clickid=${id}&owner=${owner}&clicktype=wbnews`,
        )
          .then((res) => res.text())
          .then((pageView) => Number(pageView)),
      ),
    );

    const data = Array.from(
      listBodyRegExp.exec(text)![1].matchAll(researchItemRegExp),
    ).map(([, url, month, date, year, title, description, cover], index) => ({
      title,
      time: `${year}-${month}-${date}`,
      pageView: pageViews[index],
      description,
      url,
      ...(cover
        ? { cover: cover.startsWith("/") ? `${MAIN_URL}${cover}` : cover }
        : {}),
    }));

    return res.json(<MainInfoListSuccessResponse>{
      success: true,
      data,
      page,
      totalPage: totalPageState[type],
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
