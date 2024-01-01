import type { RequestHandler } from "express";

import { MAIN_URL, getPageView } from "./utils.js";
import type { CommonFailedResponse, EmptyObject } from "../typings.js";

const listBodyRegExp = /<ul class=".*? xsyg">([\s\S]+?)<\/ul>/;
const totalItemsRegExp = /<span class="p_t">共(\d+)条<\/span>/;
const pageViewRegExp =
  /_showDynClickBatch\(\[[^\]]+\],\s*\[([^\]]+)\],\s*"wbnews",\s*(\d+)\)/;
const academicItemRegExp =
  /data-aos="fade-up">\s*<a href="(?:\.\.\/)+([^"]+)"[^>]+>\s+<div[^>]*>\s*<h4[^>]*>(.*)<\/h4>\s*<h6><span>报告人：<\/span>([^<]*?)<\/h6>\s*<h6><span>报告时间：<\/span>([^<]*?)<\/h6>\s*<h6><span>报告地点：<\/span>([^<]*?)<\/h6>/g;

export interface AcademicListOptions {
  page?: number;
  totalPage?: number;
}

export interface AcademicInfoItem {
  subject: string;
  person: string;
  time: string;
  location: string;
  pageView: number;
  url: string;
}

export interface AcademicListSuccessResponse {
  success: true;
  data: AcademicInfoItem[];
  page: number;
  totalPage: number;
}

export type AcademicListResponse =
  | AcademicListSuccessResponse
  | CommonFailedResponse;

let totalPageState = 0;

export const academicListHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  AcademicListOptions
> = async (req, res) => {
  try {
    const { page = 1, totalPage = totalPageState || 0 } = req.body;

    const response = await fetch(
      totalPage && page !== 1
        ? `${MAIN_URL}/xsyj/xsyg/${totalPage - page + 1}.htm`
        : `${MAIN_URL}/xsyj/xsyg.htm`,
    );

    if (response.status !== 200)
      return res.json(<CommonFailedResponse>{
        success: false,
        msg: "请求失败",
      });

    const content = await response.text();

    totalPageState = Math.ceil(Number(totalItemsRegExp.exec(content)![1]) / 10);

    const [, pageIds, owner] = pageViewRegExp.exec(content)!;

    const pageViews = await Promise.all(
      pageIds.split(/,\s*/).map((id) => getPageView(id, owner)),
    );

    const data = Array.from(
      listBodyRegExp.exec(content)![1].matchAll(academicItemRegExp),
    ).map(([, url, subject, person, time, location], index) => ({
      subject,
      person,
      time,
      location,
      pageView: pageViews[index],
      url,
    }));

    return res.json(<AcademicListSuccessResponse>{
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
