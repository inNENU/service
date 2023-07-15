import type { RequestHandler } from "express";

import { MAIN_URL } from "./utils.js";
import type { CommonFailedResponse, EmptyObject } from "../typings.js";
import type { Node } from "../utils/index.js";
import { getRichTextNodes, getText } from "../utils/index.js";

const infoBodyRegExp =
  /<div class="article-info">([\s\S]*?)<div class="wrapper" id="footer">/;
const infoTitleRegExp = /<h1 class="arti-title">([\s\S]*?)<\/h1>/;
const infoTimeRegExp = /<span class="arti-update">时间：([^<]*)<\/span>/;
const infoFromRegExp = /<span class="arti-update">供稿单位：([^<]*)<\/span>/;
const infoAuthorRegExp = /<span class="arti-update">撰稿：([^<]*)<\/span>/;
const infoEditorRegExp = /<span>网络编辑：<em>([^<]+?)<\/em><\/span>/;
const infoContentRegExp =
  /<div class="v_news_content">([\s\S]+?)<\/div><\/div><div id="div_vote_id">/;
const pageViewParamRegExp = /_showDynClicks\("wbnews",\s*(\d+),\s*(\d+)\)/;

export interface MainInfoOptions {
  url: string;
}

export interface MainInfoSuccessResponse {
  success: true;
  title: string;
  time: string;
  from?: string;
  author?: string;
  editor?: string;
  pageView: number;
  content: Node[];
}

export type MainInfoResponse = MainInfoSuccessResponse | CommonFailedResponse;

export const mainInfoHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  EmptyObject,
  MainInfoOptions
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

    const body = infoBodyRegExp.exec(text)![1];
    const title = infoTitleRegExp.exec(body)![1];
    const time = infoTimeRegExp.exec(body)![1];
    const content = infoContentRegExp.exec(body)![1];
    const [, owner, clickID] = pageViewParamRegExp.exec(body)!;

    const from = infoFromRegExp.exec(body)?.[1];
    const author = infoAuthorRegExp.exec(body)?.[1];
    const editor = infoEditorRegExp.exec(body)?.[1];

    const pageViewResponse = await fetch(
      `${MAIN_URL}/system/resource/code/news/click/dynclicks.jsp?clickid=${clickID}&owner=${owner}&clicktype=wbnews`,
    );

    return res.json(<MainInfoSuccessResponse>{
      success: true,
      title: getText(title),
      time,
      from,
      author,
      editor,
      pageView: Number(await pageViewResponse.text()),
      content: await getRichTextNodes(content, {
        getClass: (tag, className) =>
          tag === "img"
            ? className
              ? `img ${className}`
              : "img"
            : className ?? null,
        getImageSrc: (src) => (src.startsWith("/") ? `${MAIN_URL}${src}` : src),
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
