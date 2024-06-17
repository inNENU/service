import type { RichTextNode } from "@mptool/parser";
import { getRichTextNodes } from "@mptool/parser";
import type { RequestHandler } from "express";

import { actionLogin } from "./login.js";
import { ACTION_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import type { ActionFailType } from "../config/index.js";
import { ExpiredResponse } from "../config/index.js";
import { MY_SERVER } from "../my/utils.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  CommonSuccessResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import type { VPNLoginFailedResponse } from "../vpn/login.js";

const TITLE_REGEXP = /var title = '(.*?)';/;
const FROM_REGEXP = /var ly = '(.*?)'/;
const AUTHOR_REGEXP = /var wz = '(.*?)'/;
const TIME_REGEXP =
  /<span style="margin: 0 10px;font-size: 13px;color: #787878;font-family: 'Microsoft YaHei';">\s+时间：(.*?)(?:&nbsp;)*?\s+<\/span>/;
const PAGEVIEW_REGEXP =
  /<span style="margin: 0 10px;font-size: 13px;color: #787878;font-family: 'Microsoft YaHei';">\s+阅览：(\d+)\s+<\/span>/;
const CONTENT_REGEXP =
  /<div class="read" id="WBNR">\s+([^]*?)\s+<\/div>\s+<p id="zrbj"/;

export interface NoticeOptions extends LoginOptions {
  noticeID: string;
}

export interface NoticeData {
  title: string;
  author: string;
  time: string;
  from: string;
  pageView: number;
  content: RichTextNode[];
}

export type NoticeSuccessResponse = CommonSuccessResponse<NoticeData>;

export type NoticeResponse =
  | NoticeSuccessResponse
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse
  | CommonFailedResponse<ActionFailType.Expired | ActionFailType.Unknown>;

export const noticeHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  NoticeOptions
> = async (req, res) => {
  try {
    const { noticeID } = req.body;

    if (!noticeID) throw new Error("ID is required");

    const noticeUrl = `${ACTION_SERVER}/page/viewNews?ID=${noticeID}`;

    if (!req.headers.cookie) {
      if (!req.body.id || !req.body.password)
        throw new Error(`"id" and password" field is required!`);

      const result = await actionLogin(req.body as AccountInfo);

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(noticeUrl);
    }

    const response = await fetch(noticeUrl, {
      headers: {
        Cookie: req.headers.cookie,
      },
      redirect: "manual",
    });

    if (response.status === 302) return res.json(ExpiredResponse);

    const text = await response.text();

    const title = TITLE_REGEXP.exec(text)![1];
    const author = AUTHOR_REGEXP.exec(text)![1];
    const time = TIME_REGEXP.exec(text)![1];
    const from = FROM_REGEXP.exec(text)![1];
    const pageView = PAGEVIEW_REGEXP.exec(text)![1];
    const content = CONTENT_REGEXP.exec(text)![1];

    const data = {
      title,
      author,
      from,
      time,
      pageView: Number(pageView),
      content: await getRichTextNodes(content, {
        transform: {
          a: (node) => {
            const href = node.attrs?.href;

            if (
              href &&
              !href.startsWith(ACTION_SERVER) &&
              !href.startsWith(MY_SERVER)
            )
              node.children?.push({ type: "text", text: ` (${href})` });

            return node;
          },
          // TODO: Support image
          img: () => null,
        },
      }),
    };

    return res.json({
      success: true,
      data,
    } as NoticeSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      msg: message,
    } as AuthLoginFailedResponse);
  }
};
