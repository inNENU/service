import type { RichTextNode } from "@mptool/parser";
import { getRichTextNodes } from "@mptool/parser";

import { request } from "@/utils/index.js";

import { ACTION_SERVER, INFO_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import type { ActionFailType } from "../config/index.js";
import { ExpiredResponse, MissingArgResponse } from "../config/index.js";
import { MY_SERVER } from "../my/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  LoginOptions,
} from "../typings.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";

const ID_TITLE_REGEXP = /var title = '(.*?)';/;
const ID_FROM_REGEXP = /var ly = '(.*?)'/;
const ID_TIME_REGEXP =
  /<span style="margin: 0 10px;font-size: 13px;color: #787878;font-family: 'Microsoft YaHei';">\s+时间：(.*?)(?:&nbsp;)*?\s+<\/span>/;
const ID_PAGEVIEW_REGEXP =
  /<span style="margin: 0 10px;font-size: 13px;color: #787878;font-family: 'Microsoft YaHei';">\s+阅览：(\d+)\s+<\/span>/;
const ID_CONTENT_REGEXP =
  /<div class="read" id="WBNR">\s+([^]*?)\s+<\/div>\s+<p id="zrbj"/;

const TITLE_REGEXP = /name="pageTitle" content="(.*)"/;
const FROM_REGEXP = /<span>(?:发布单位|供稿单位)：(.*)<\/span>/;
const TIME_REGEXP = /<span>发布时间：(.*)<\/span>/;
const PAGEVIEW_REGEXP = /_showDynClicks\("wbnews", (\d+), (\d+)\)/;
const CONTENT_REGEXP =
  /<div id="vsb_content.*?>([^]*?)\s*<\/div>\s*<div id="div_vote_id"/;

export interface NoticeOptions extends LoginOptions {
  noticeID: string;
  noticeUrl?: string;
}

export interface NoticeData {
  title: string;
  from: string;
  time: string;
  pageView: number;
  content: RichTextNode[];
}

export type NoticeSuccessResponse = CommonSuccessResponse<NoticeData>;

export type NoticeResponse =
  | NoticeSuccessResponse
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse
  | CommonFailedResponse<
      | ActionFailType.MissingArg
      | ActionFailType.MissingCredential
      | ActionFailType.Unknown
    >;

const TEST_NOTICE_DETAIL: NoticeSuccessResponse = {
  success: true,
  data: {
    title: "测试标题",
    time: `${new Date().getFullYear()}-01-01`,
    from: "测试来源",
    pageView: 123,
    content: [
      {
        type: "node",
        name: "p",
        children: [
          {
            type: "text",
            text: "测试内容1",
          },
        ],
      },
      {
        type: "node",
        name: "p",
        children: [
          {
            type: "text",
            text: "测试内容2",
          },
        ],
      },
    ],
  },
};

export const getNoticeDetailById = async (
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

  const title = ID_TITLE_REGEXP.exec(text)![1];
  const time = ID_TIME_REGEXP.exec(text)![1];
  const from = ID_FROM_REGEXP.exec(text)![1];
  const pageView = ID_PAGEVIEW_REGEXP.exec(text)![1];
  const content = ID_CONTENT_REGEXP.exec(text)![1];

  const data = {
    title,
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
        // We won't support old notice image
        img: () => null,
      },
    }),
  };

  return {
    success: true,
    data,
  };
};

export const getNoticeDetailByUrl = async (
  cookieHeader: string,
  noticeUrl: string,
): Promise<NoticeResponse> => {
  const response = await fetch(`${INFO_SERVER}${noticeUrl}`, {
    headers: {
      Cookie: cookieHeader,
    },
    redirect: "manual",
  });

  if (response.status === 302) return ExpiredResponse;

  const text = await response.text();

  const title = TITLE_REGEXP.exec(text)![1];
  const time = TIME_REGEXP.exec(text)![1];
  const from = FROM_REGEXP.exec(text)![1];
  const [, owner, clickId] = PAGEVIEW_REGEXP.exec(text)!;
  const content = CONTENT_REGEXP.exec(text)![1];

  const pageviews = await fetch(
    `${INFO_SERVER}/system/resource/code/news/click/dynclicks.jsp?clickid=${clickId}&owner=${owner}&clicktype=wbnews`,
    {
      headers: {
        Cookie: cookieHeader,
      },
      redirect: "manual",
    },
  );

  const data = {
    title,
    from,
    time,
    pageView: Number(await pageviews.text()),
    content: await getRichTextNodes(content, {
      transform: {
        a: (node) => {
          const href = node.attrs?.href;

          if (
            href &&
            !href.startsWith(ACTION_SERVER) &&
            !href.startsWith(INFO_SERVER) &&
            !href.startsWith(MY_SERVER)
          )
            node.children?.push({ type: "text", text: ` (${href})` });

          return node;
        },
        img: async (node) => {
          const src = node.attrs?.src;

          // convert to base64
          if (src?.startsWith("/")) {
            const imageResponse = await fetch(`${INFO_SERVER}${src}`, {
              headers: {
                Cookie: cookieHeader,
              },
            });

            if (imageResponse.ok) {
              const buffer = await imageResponse.arrayBuffer();

              node.attrs!.src = `data:${imageResponse.headers.get(
                "content-type",
              )};base64,${Buffer.from(buffer).toString("base64")}`;

              return node;
            }
          }

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

export const noticeHandler = request<NoticeResponse, NoticeOptions>(
  async (req, res) => {
    const { noticeUrl, noticeID } = req.body;

    if (!noticeUrl && !noticeID)
      return res.json(MissingArgResponse("公告链接或公告ID"));

    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(TEST_NOTICE_DETAIL);

    if (noticeUrl) {
      return res.json(await getNoticeDetailByUrl(cookieHeader, noticeUrl));
    }

    return res.json(await getNoticeDetailById(cookieHeader, noticeID));
  },
);
