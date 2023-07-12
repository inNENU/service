import type { RequestHandler } from "express";

import type { CommonFailedResponse, EmptyObject } from "../typings.js";
import type { Node } from "../utils/index.js";
import { getRichTextNodes } from "../utils/index.js";

const bodyRegExp =
  /<div class="article-info">([\s\S]*?)<div class="info-aside">/;
const titleRegExp =
  /<h1 class="arti-title">([\s\S]*?)(<br \/><span class="arti-subtitle">.*?<\/span>)?<\/h1>/;
const timeRegExp = /<span class="arti-update">时间：([^<]*)<\/span>/;
const fromRegExp = /<span class="arti-update">供稿单位：([^<]*)<\/span>/;
const authorRegExp = /<span class="arti-update">撰稿：([^<]*)<\/span>/;
const editorRegExp = /<span>网络编辑：<em>([^<]+?)<\/em><\/span>/;
const contentRegExp =
  /<div class="v_news_content">([\s\S]+?)<\/div><\/div><div id="div_vote_id">/;
const pageViewParamRegExp = /_showDynClicks\("wbnews",\s*(\d+),\s*(\d+)\)/;

export interface MainInfoOptions {
  url: string;
}

export interface MainInfoSuccessResponse {
  success: true;
  /** @deprecated */
  status: "success";
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

    const response = await fetch(`https://www.nenu.edu.cn/${url}`);

    if (response.status !== 200)
      return res.json(<CommonFailedResponse>{
        success: false,
        status: "failed",
        msg: "请求失败",
      });

    const text = await response.text();

    const body = bodyRegExp.exec(text)![1];
    const title = titleRegExp.exec(body)![1];
    const time = timeRegExp.exec(body)![1];
    const content = contentRegExp.exec(body)![1];
    const [, owner, clickID] = pageViewParamRegExp.exec(body)!;

    const from = fromRegExp.exec(body)?.[1];
    const author = authorRegExp.exec(body)?.[1];
    const editor = editorRegExp.exec(body)?.[1];

    const pageViewResponse = await fetch(
      `https://www.nenu.edu.cn/system/resource/code/news/click/dynclicks.jsp?clickid=${clickID}&owner=${owner}&clicktype=wbnews`,
    );

    return res.json(<MainInfoSuccessResponse>{
      success: true,
      status: "success",
      title,
      time,
      from,
      author,
      editor,
      pageView: Number(await pageViewResponse.text()),
      content: await getRichTextNodes(content),
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<CommonFailedResponse>{
      success: false,
      status: "failed",
      msg: message,
    });
  }
};
