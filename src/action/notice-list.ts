import type { RequestHandler } from "express";

import { actionLogin } from "./login.js";
import { ACTION_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { ActionFailType } from "../config/actionFailType.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  CommonListSuccessResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";

const NOTICE_LIST_QUERY_URL = `${ACTION_SERVER}/page/queryList`;

export interface NoticeListOptions extends LoginOptions {
  /**
   * 类型
   *
   * @default "notice"
   */
  type?: "notice" | "news";
  /**
   * 每页尺寸
   *
   * @default 20
   */
  size?: number;
  /**
   * 当前页面
   *
   * @default 1
   */
  current?: number;
}

interface RawNoticeItem {
  LLCS: number;
  FBSJ: string;
  KEYWORDS_: string;
  ID__: string;
  SFZD: string;
  FLAG: string;
  RN: number;
  CJBM: string;
  TYPE: "notice";
}

interface RawNoticeListData {
  data: RawNoticeItem[];
  pageIndex: number;
  totalPage: number;
  pageSize: number;
  totalCount: number;
}

export interface NoticeInfo {
  title: string;
  from: string;
  time: string;
  id: string;
}

const getNoticeItem = ({
  ID__: id,
  CJBM: from,
  KEYWORDS_: title,
  FBSJ: time,
}: RawNoticeItem): NoticeInfo => ({
  id,
  title,
  from,
  time,
});

export interface NoticeListSuccessResponse
  extends CommonListSuccessResponse<NoticeInfo[]> {
  size: number;
  count: number;
}

export type NoticeListResponse =
  | NoticeListSuccessResponse
  | CommonFailedResponse;

export const noticeListHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  NoticeListOptions
> = async (req, res) => {
  try {
    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      if (!req.body.id || !req.body.password)
        throw new Error(`"id" and password" field is required!`);

      const result = await actionLogin(req.body as AccountInfo);

      if (!result.success) return res.json(result);

      cookieHeader = result.cookieStore.getHeader(NOTICE_LIST_QUERY_URL);
    }

    const { type = "notice", size = 20, current = 1 } = req.body;

    const response = await fetch(NOTICE_LIST_QUERY_URL, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookieHeader,
        Referer: `${ACTION_SERVER}/basicInfo/studentPageTurn?type=lifeschool`,
      },
      body: new URLSearchParams({
        type,
        _search: "false",
        nd: Date.now().toString(),
        limit: size.toString(),
        page: current.toString(),
      }),
      redirect: "manual",
    });

    if (response.status === 302)
      return res.json({
        success: false,
        type: ActionFailType.Expired,
        msg: "登录信息已过期，请重新登录",
      } as AuthLoginFailedResponse);

    const { data, pageIndex, pageSize, totalCount, totalPage } =
      (await response.json()) as RawNoticeListData;

    if (data.length)
      return res.json({
        success: true,
        data: data.map(getNoticeItem),
        count: totalCount,
        size: pageSize,
        current: pageIndex,
        total: totalPage,
      } as NoticeListSuccessResponse);

    throw new Error(`获取公告列表失败: ${JSON.stringify(data, null, 2)}`);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      msg: message,
    } as CommonFailedResponse);
  }
};
