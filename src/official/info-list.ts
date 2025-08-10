import { request } from "@/utils/index.js";

import { OFFICIAL_URL, getOfficialPageView } from "./utils.js";
import type { ActionFailType } from "../config/index.js";
import { InvalidArgResponse, UnknownResponse } from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonListSuccessResponse,
} from "../typings.js";

const LIST_REGEXP = /<ul class=".*? dsyw">([^]+?)<\/ul>/;
const ITEM_REGEXP =
  /data-aos="fade-up">\s*<a href="(?:\.\.\/)+([^"]+)"[^>]+>\s+<div[^>]*>\s+<div class="time">\s+<h3>(.*?)\.(.*?)<\/h3>\s*<h6>(.*?)<\/h6>\s*<\/div>\s*<\/div>\s*<div class="rr">\s*<h4[^>]*>(.*)<\/h4>\s+<p[^>]*>\s*([^<]*?)\s*<\/p>\s*<\/div>\s*(?:<div class="img slow imgBox">[^]*?src="(.*?)"[^]+?)?<\/a>/g;
const TOTAL_REGEXP = /<span class="p_t">共(\d+)条<\/span>/;
const PAGEVIEW_PARAMS_REGEXP =
  /_showDynClickBatch\(\[[^\]]+\],\s*\[([^\]]+)\],\s*"wbnews",\s*(\d+)\)/;

const TYPE2ID = {
  social: "xsyj/rwsk",
  science: "xsyj/zrkx",
  news: "dsyw/ywsd",
  media: "dsyw/mtsd",
};

const totalPageState: Record<string, number> = {};

export type OfficialInfoType = "social" | "science" | "news" | "media";

export interface OfficialInfoListOptions {
  type: OfficialInfoType;
  current?: number;
  total?: number;
}

export interface OfficialInfoItem {
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

export type OfficialInfoListSuccessResponse = CommonListSuccessResponse<
  OfficialInfoItem[]
>;

export type OfficialInfoListResponse =
  | OfficialInfoListSuccessResponse
  | CommonFailedResponse<ActionFailType.InvalidArg | ActionFailType.Unknown>;

export const getOfficialInfoList = async ({
  type,
  current = 1,
  total = totalPageState[type] || 0,
}: OfficialInfoListOptions): Promise<OfficialInfoListResponse> => {
  if (!["social", "science", "news", "media"].includes(type))
    return InvalidArgResponse("type");

  const response = await fetch(
    total && current !== 1
      ? `${OFFICIAL_URL}/${TYPE2ID[type]}/${total - current + 1}.htm`
      : `${OFFICIAL_URL}/${TYPE2ID[type]}.htm`,
  );

  if (response.status !== 200) return UnknownResponse("请求失败");

  const content = await response.text();

  totalPageState[type] = Math.ceil(Number(TOTAL_REGEXP.exec(content)![1]) / 10);

  const [, pageIds, owner] = PAGEVIEW_PARAMS_REGEXP.exec(content)!;

  const pageViews = await Promise.all(
    pageIds.split(/,\s*/).map((id) => getOfficialPageView(id, owner)),
  );

  const data = Array.from(
    LIST_REGEXP.exec(content)![1].matchAll(ITEM_REGEXP),
  ).map(([, url, month, date, year, title, description, cover], index) => ({
    title,
    time: `${year}-${month}-${date}`,
    pageView: pageViews[index],
    description,
    url,
    ...(cover
      ? { cover: cover.startsWith("/") ? `${OFFICIAL_URL}${cover}` : cover }
      : {}),
  }));

  return {
    success: true,
    data,
    current,
    total: totalPageState[type],
  };
};

export const officialInfoListHandler = request<
  OfficialInfoListResponse,
  OfficialInfoListOptions,
  OfficialInfoListOptions
>(async (req, res) => {
  return res.json(
    await getOfficialInfoList(req.method === "GET" ? req.query : req.body),
  );
});
