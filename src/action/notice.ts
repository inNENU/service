import type { RequestHandler } from "express";
import type { Cookie } from "set-cookie-parser";

import { actionLogin } from "./login.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import type {
  CommonFailedResponse,
  CookieOptions,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import type { Node } from "../utils/getNodes.js";
import { getCookieHeader, getRichTextNodes } from "../utils/index.js";

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
  /** @deprecated */
  status: "success";
  title: string;
  author: string;
  time: string;
  from: string;
  pageView: number;
  content: Node[];
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
        status: "failed",
        msg: "ID is required",
      });

    let cookies: Cookie[] = [];

    if ("cookies" in req.body) {
      ({ cookies } = req.body);
    } else {
      const result = await actionLogin(req.body);

      if (!result.success) return res.json(result);

      ({ cookies } = result);
    }

    const url = `https://m-443.webvpn.nenu.edu.cn/page/viewNews?ID=${noticeID}`;

    const response = await fetch(url, {
      headers: {
        Cookie: getCookieHeader(cookies),
      },
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
      status: "success",
      title,
      author,
      from,
      time,
      pageView: Number(pageView),
      content: await getRichTextNodes(content, {
        getLinkText: (link) =>
          link.startsWith("https://m-443.webvpn.nenu.edu.cn") ||
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
    res.json(<AuthLoginFailedResponse>{
      success: false,
      status: "failed",
      msg: message,
    });
  }
};
