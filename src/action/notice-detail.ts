import type { RichTextNode } from "@mptool/parser";
import { getRichTextNodes } from "@mptool/parser";
import type { RequestHandler } from "express";

import { actionLogin } from "./login.js";
import { ACTION_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import type { ActionFailType } from "../config/index.js";
import {
  ExpiredResponse,
  MissingArgResponse,
  MissingCredentialResponse,
  UnknownResponse,
} from "../config/index.js";
import { MY_SERVER } from "../my/utils.js";
import type {
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

const TEST_NOTICE_DETAIL: NoticeSuccessResponse = {
  success: true,
  data: {
    title: "测试标题",
    author: "测试作者",
    time: "2021-01-01",
    from: "测试来源",
    pageView: 100,
    content: [
      {
        type: "node",
        name: "p",
        children: [
          {
            type: "text",
            text: "测试内容",
          },
        ],
      },
    ],
  },
};

export const getNoticeDetail = async (
  cookieHeader: string,
  noticeID: string,
): Promise<NoticeResponse> => {
  const url = `${ACTION_SERVER}/page/viewNews?ID=${noticeID}`;

  const response = await fetch(url, {
    headers: {
      Cookie: cookieHeader,
    },
    redirect: "manual",
  });

  if (response.status === 302) return ExpiredResponse;

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

  return {
    success: true,
    data,
  };
};

export const noticeHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  NoticeOptions
> = async (req, res) => {
  try {
    const { id, password, noticeID, authToken } = req.body;

    if (!noticeID) return res.json(MissingArgResponse("公告 ID"));

    if (id && password && authToken) {
      const result = await actionLogin({ id, password, authToken });

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(ACTION_SERVER);
    } else if (!req.headers.cookie) {
      return res.json(MissingCredentialResponse);
    }

    const cookieHeader = req.headers.cookie;

    if (cookieHeader.includes("TEST")) return res.json(TEST_NOTICE_DETAIL);

    return res.json(await getNoticeDetail(cookieHeader, noticeID));
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
