import type { RequestHandler } from "express";

import { actionLogin } from "./login.js";
import { SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/index.js";
import type { AuthLoginFailedResponse } from "../auth/login.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type {
  CommonFailedResponse,
  CookieOptions,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import type { RichTextNode } from "../utils/getRichText.js";
import {
  CookieStore,
  getCookieItems,
  getRichTextNodes,
} from "../utils/index.js";

const titleRegExp = /var title = '(.*?)';/;
const fromRegExp = /var ly = '(.*?)'/;
const authorRegExp = /var wz = '(.*?)'/;
const timeRegExp =
  /<span style="margin: 0 10px;font-size: 13px;color: #787878;font-family: 'Microsoft YaHei';">\s+时间：(.*?)(?:&nbsp;)*?\s+<\/span>/;
const pageViewRegExp =
  /<span style="margin: 0 10px;font-size: 13px;color: #787878;font-family: 'Microsoft YaHei';">\s+阅览：(\d+)\s+<\/span>/;
const contentRegExp =
  /<div class="read" id="WBNR">\s+([\s\S]*?)\s+<\/div>\s+<p id="zrbj"/;

export type NoticeOptions = (LoginOptions | CookieOptions) & {
  noticeID: string;
};

export interface NoticeSuccessResponse {
  success: true;
  title: string;
  author: string;
  time: string;
  from: string;
  pageView: number;
  content: RichTextNode[];
}

export type NoticeResponse = NoticeSuccessResponse | CommonFailedResponse;

export const noticeHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  NoticeOptions
> = async (req, res) => {
  try {
    const { noticeID } = req.body;

    if (!noticeID)
      return res.json(<CommonFailedResponse>{
        success: false,
        msg: "ID is required",
      });

    const cookieStore = new CookieStore();

    if (!req.headers.cookie)
      if ("cookies" in req.body) {
        cookieStore.apply(getCookieItems(req.body.cookies));
      } else {
        const result = await actionLogin(req.body, cookieStore);

        if (!result.success) return res.json(result);
      }

    const url = `${SERVER}/page/viewNews?ID=${noticeID}`;

    const response = await fetch(url, {
      headers: {
        Cookie: req.headers.cookie || cookieStore.getHeader(url),
      },
      redirect: "manual",
    });

    if (response.status === 302)
      return res.json(<AuthLoginFailedResponse>{
        success: false,
        type: LoginFailType.Expired,
        msg: "登录信息已过期，请重新登录",
      });

    const responseText = await response.text();

    const title = titleRegExp.exec(responseText)![1];
    const author = authorRegExp.exec(responseText)![1];
    const time = timeRegExp.exec(responseText)![1];
    const from = fromRegExp.exec(responseText)![1];
    const pageView = pageViewRegExp.exec(responseText)![1];
    const content = contentRegExp.exec(responseText)![1];

    return res.json(<NoticeSuccessResponse>{
      success: true,
      title,
      author,
      from,
      time,
      pageView: Number(pageView),
      content: await getRichTextNodes(content, {
        getLinkText: (link) =>
          link.startsWith(SERVER) ||
          link.startsWith("https://my.webvpn.nenu.edu.cn")
            ? null
            : link,
        // TODO: Support image
        getImageSrc: () => null,
      }),
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};
