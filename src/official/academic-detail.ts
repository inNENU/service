import type { RichTextNode } from "@mptool/parser";
import { getRichTextNodes } from "@mptool/parser";

import { isValidPathname, request } from "@/utils/index.js";

import { OFFICIAL_URL, getOfficialPageView } from "./utils.js";
import type { ActionFailType } from "../config/index.js";
import { MissingArgResponse, UnknownResponse } from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../typings.js";

const INFO_REGEXP =
  /<div class="ar_tit">\s*<h3>([^>]+)<\/h3>\s*<h6>([^]+?)<\/h6>/;
const CONTENT_REGEXP =
  /<div class="v_news_content">([^]+?)<\/div>\s*<\/div>\s*<div id="div_vote_id">/;
const TIME_REGEXP = /<span>发布时间：([^<]*)<\/span>/;
const PAGEVIEW_PARAMS_REGEXP = /_showDynClicks\("wbnews",\s*(\d+),\s*(\d+)\)/;

export interface OfficialAcademicDetailOptions {
  /** 学术会议链接 */
  url: string;
}

export interface OfficialAcademicData {
  /** 标题 */
  title: string;
  /** 时间 */
  time: string;
  /** 浏览量 */
  pageView: number;
  /** 内容 */
  content: RichTextNode[];
}

export type OfficialAcademicDetailSuccessResponse =
  CommonSuccessResponse<OfficialAcademicData>;

export type OfficialAcademicDetailResponse =
  | OfficialAcademicDetailSuccessResponse
  | CommonFailedResponse<ActionFailType.MissingArg | ActionFailType.Unknown>;

export const getAcademicDetail = async (
  url: string,
): Promise<OfficialAcademicDetailResponse> => {
  if (!url) return MissingArgResponse("url");

  if (!isValidPathname(url)) return UnknownResponse("url参数不合法");

  const response = await fetch(`${OFFICIAL_URL}/${url}`);

  if (response.status !== 200) return UnknownResponse("请求失败");

  const text = await response.text();

  const [, title, info] = INFO_REGEXP.exec(text)!;

  const time = TIME_REGEXP.exec(info)![1];
  const [, owner, id] = PAGEVIEW_PARAMS_REGEXP.exec(info)!;
  const content = CONTENT_REGEXP.exec(text)![1];

  const data: OfficialAcademicData = {
    title,
    time,
    pageView: await getOfficialPageView(id, owner),
    content: await getRichTextNodes(content, {
      transform: {
        img: (node) => {
          const src = node.attrs?.src;

          if (src) {
            if (src.includes("/fileTypeImages/")) return null;

            if (src.startsWith("/")) node.attrs!.src = `${OFFICIAL_URL}${src}`;
          }

          return node;
        },
        td: (node) => {
          delete node.attrs?.style;

          return node;
        },
      },
    }),
  };

  return {
    success: true,
    data,
  };
};

export const officialAcademicDetailHandler = request<
  OfficialAcademicDetailResponse,
  OfficialAcademicDetailOptions,
  OfficialAcademicDetailOptions
>(async (req, res) => {
  return res.json(await getAcademicDetail(req.query.url || req.body.url));
});
