import type { RequestHandler } from "express";

import { MAIN_URL } from "./utils.js";
import type { CommonFailedResponse, EmptyObject } from "../typings.js";
import type { RichTextNode } from "../utils/index.js";
import { getRichTextNodes } from "../utils/index.js";

const infoRegExp =
  /<div class="ar_tit">\s*<h3>([^>]+)<\/h3>\s*<h6>([\s\S]+?)<\/h6>/;
const contentRegExp =
  /<div class="v_news_content">([\s\S]+?)<\/div><\/div><div id="div_vote_id">/;

const infoTimeRegExp = /<span>发布时间：([^<]*)<\/span>/;
const infoFromRegExp = /<span>发布单位：([^<]*)<\/span>/;
const pageViewParamRegExp = /_showDynClicks\("wbnews",\s*(\d+),\s*(\d+)\)/;

export interface MainNoticeInfoOptions {
  url: string;
}

export interface MainNoticeInfoSuccessResponse {
  success: true;
  title: string;
  time: string;
  from?: string;
  pageView: number;
  content: RichTextNode[];
}

export type MainNoticeInfoResponse =
  | MainNoticeInfoSuccessResponse
  | CommonFailedResponse;

export const mainNoticeInfoHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  EmptyObject,
  MainNoticeInfoOptions
> = async (req, res) => {
  try {
    const { url } = req.query;

    const response = await fetch(`${MAIN_URL}/${url}`);

    if (response.status !== 200)
      return res.json(<CommonFailedResponse>{
        success: false,
        msg: "请求失败",
      });

    const text = await response.text();

    const [, title, info] = infoRegExp.exec(text)!;

    const time = infoTimeRegExp.exec(info)![1];
    const from = infoFromRegExp.exec(info)?.[1];

    const [, owner, clickID] = pageViewParamRegExp.exec(info)!;
    const content = contentRegExp.exec(text)![1];

    const pageViewResponse = await fetch(
      `${MAIN_URL}/system/resource/code/news/click/dynclicks.jsp?clickid=${clickID}&owner=${owner}&clicktype=wbnews`,
    );

    return res.json(<MainNoticeInfoSuccessResponse>{
      success: true,
      title,
      time,
      from,
      pageView: Number(await pageViewResponse.text()),
      content: await getRichTextNodes(content, {
        getClass: (tag, className) =>
          tag === "img"
            ? className
              ? `img ${className}`
              : "img"
            : className ?? null,
        getImageSrc: (src) =>
          src.includes("/fileTypeImages/")
            ? null
            : src.startsWith("/")
              ? `${MAIN_URL}${src}`
              : src,
      }),
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
