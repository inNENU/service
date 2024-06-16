import type { RequestHandler } from "express";

import { OFFICIAL_URL, getOfficialPageView } from "./utils.js";
import type {
  CommonFailedResponse,
  CommonListSuccessResponse,
  EmptyObject,
} from "../typings.js";

const ITEM_REGEXP =
  /data-aos="fade-up">\s*<a href="([^"]+)"[^>]+>\s+<div class="time">\s+<h3>(.*?)\.(.*?)<\/h3>\s*<h6>(.*?)<\/h6>\s*<\/div>\s*<div[^>]*>\s*<h4[^>]*>(.*)<\/h4>\s+<h6>(.*?)<span>/g;
const TOTAL_REGEXP = /<span class="p_t">共(\d+)条<\/span>/;
const PAGEVIEW_PARAMS_REGEXP =
  /_showDynClickBatch\(\[[^\]]+\],\s*\[([^\]]+)\],\s*"wbnews",\s*(\d+)\)/;

export interface OfficialNoticeListOptions {
  current?: number;
  total?: number;
}

export interface OfficialNoticeInfoItem {
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

export type OfficialNoticeSuccessResponse = CommonListSuccessResponse<
  OfficialNoticeInfoItem[]
>;

export type AnnouncementListResponse =
  | OfficialNoticeSuccessResponse
  | CommonFailedResponse;

let totalPageState = 0;

export const officialNoticeListHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  OfficialNoticeListOptions
> = async (req, res) => {
  try {
    const { current = 1, total = totalPageState } = req.body;

    const response = await fetch(
      total && current !== 1
        ? `${OFFICIAL_URL}/tzgg/${total - current + 1}.htm`
        : `${OFFICIAL_URL}/tzgg.htm`,
    );

    if (response.status !== 200) throw new Error("请求失败");

    const content = await response.text();

    totalPageState = Math.ceil(Number(TOTAL_REGEXP.exec(content)![1]) / 10);

    const [, pageIds, owner] = PAGEVIEW_PARAMS_REGEXP.exec(content)!;

    const pageViews = await Promise.all(
      pageIds.split(/,\s*/).map((id) => getOfficialPageView(id, owner)),
    );

    const data = Array.from(content.matchAll(ITEM_REGEXP)).map(
      ([, url, month, date, year, title, from], index) => ({
        title,
        time: `${year}-${month}-${date}`,
        pageView: pageViews[index],
        from,
        url,
      }),
    );

    return res.json({
      success: true,
      data,
      current,
      total: totalPageState,
    } as OfficialNoticeSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      msg: message,
    } as CommonFailedResponse);
  }
};
