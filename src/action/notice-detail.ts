import type { RichTextNode } from "@mptool/parser";
import { getRichTextNodes } from "@mptool/parser";

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
import { request } from "../utils/index.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";

const TITLE_REGEXP = /name="pageTitle" content="(.*)"/;
const FROM_REGEXP = /<span>(?:发布单位|供稿单位)：(.*)<\/span>/;
const TIME_REGEXP = /<span>发布时间：(.*)<\/span>/;
const PAGEVIEW_REGEXP = /_showDynClicks\("wbnews", (\d+), (\d+)\)/;
const CONTENT_REGEXP =
  /<div id="vsb_content.*?>([^]*?)\s*<\/div>\s*<div id="div_vote_id"/;

export interface NoticeOptions extends LoginOptions {
  noticeUrl: string;
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

export const getNoticeDetail = async (
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
    const { noticeUrl } = req.body;

    if (!noticeUrl) return res.json(MissingArgResponse("公告链接"));

    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(TEST_NOTICE_DETAIL);

    return res.json(await getNoticeDetail(cookieHeader, noticeUrl));
  },
);
