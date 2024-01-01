import type { RequestHandler } from "express";

import { MAIN_URL, getPageView } from "./utils.js";
import type { CommonFailedResponse, EmptyObject } from "../typings.js";
import type { RichTextNode } from "../utils/index.js";
import { getRichTextNodes } from "../utils/index.js";

const infoRegExp =
  /<div class="ar_tit">\s*<h3>([^>]+)<\/h3>\s*<h6>([\s\S]+?)<\/h6>/;
const contentRegExp =
  /<div class="v_news_content">([\s\S]+?)<\/div><\/div><div id="div_vote_id">/;
const infoTimeRegExp = /<span>发布时间：([^<]*)<\/span>/;
const pageViewParamRegExp = /_showDynClicks\("wbnews",\s*(\d+),\s*(\d+)\)/;

export interface AcademicInfoOptions {
  url: string;
}

export interface AcademicInfoSuccessResponse {
  success: true;
  title: string;
  time: string;
  pageView: number;
  content: RichTextNode[];
}

export type AcademicInfoResponse =
  | AcademicInfoSuccessResponse
  | CommonFailedResponse;

export const academicInfoHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  EmptyObject,
  AcademicInfoOptions
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
    const [, owner, id] = pageViewParamRegExp.exec(info)!;
    const content = contentRegExp.exec(text)![1];

    const pageView = await getPageView(id, owner);

    return res.json(<AcademicInfoSuccessResponse>{
      success: true,
      title,
      time,
      pageView,
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
