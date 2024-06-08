import type { RichTextNode } from "@mptool/parser";
import { getRichTextNodes } from "@mptool/parser";
import type { RequestHandler } from "express";

import { MAIN_URL, getPageView } from "./utils.js";
import type { CommonFailedResponse, EmptyObject } from "../typings.js";

const infoRegExp =
  /<div class="ar_tit">\s*<h3>([^>]+)<\/h3>\s*<h6>([^]+?)<\/h6>/;
const contentRegExp =
  /<div class="v_news_content">([^]+?)<\/div><\/div><div id="div_vote_id">/;

const infoTimeRegExp = /<span>发布时间：([^<]*)<\/span>/;
const infoFromRegExp = /<span>发布单位：([^<]*)<\/span>/;
const pageViewParamRegExp = /_showDynClicks\("wbnews",\s*(\d+),\s*(\d+)\)/;

export interface AnnouncementInfoOptions {
  url: string;
}

export interface AnnouncementInfoSuccessResponse {
  success: true;
  title: string;
  time: string;
  from?: string;
  pageView: number;
  content: RichTextNode[];
}

export type AnnouncementInfoResponse =
  | AnnouncementInfoSuccessResponse
  | CommonFailedResponse;

export const announcementInfoHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  EmptyObject,
  AnnouncementInfoOptions
> = async (req, res) => {
  try {
    const { url } = req.query;

    const response = await fetch(`${MAIN_URL}/${url}`);

    if (response.status !== 200)
      return res.json({
        success: false,
        msg: "请求失败",
      } as CommonFailedResponse);

    const text = await response.text();

    const [, title, info] = infoRegExp.exec(text)!;

    const time = infoTimeRegExp.exec(info)![1];
    const from = infoFromRegExp.exec(info)?.[1];

    const [, owner, id] = pageViewParamRegExp.exec(info)!;
    const content = contentRegExp.exec(text)![1];

    const pageView = await getPageView(id, owner);

    return res.json({
      success: true,
      title,
      time,
      from,
      pageView,
      content: await getRichTextNodes(content, {
        transform: {
          img: (node) => {
            const src = node.attrs?.src;

            if (src) {
              if (src.includes("/fileTypeImages/")) return null;

              if (src.startsWith("/")) node.attrs!.src = `${MAIN_URL}${src}`;
            }

            return node;
          },
          td: (node) => {
            delete node.attrs?.style;

            return node;
          },
        },
      }),
    } as AnnouncementInfoSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);
    res.json({
      success: false,
      msg: message,
    } as CommonFailedResponse);
  }
};
