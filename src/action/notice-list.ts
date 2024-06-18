import type { RequestHandler } from "express";

import { actionLogin } from "./login.js";
import { ACTION_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import type { ActionFailType } from "../config/index.js";
import {
  ExpiredResponse,
  MissingCredentialResponse,
  UnknownResponse,
} from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonListSuccessResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import type { VPNLoginFailedResponse } from "../vpn/login.js";

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
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse
  | CommonFailedResponse<ActionFailType.Expired | ActionFailType.Unknown>;

export const noticeListHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  NoticeListOptions
> = async (req, res) => {
  try {
    const { id, password, type = "notice", size = 20, current = 1 } = req.body;

    if (id && password) {
      const result = await actionLogin({ id, password });

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(NOTICE_LIST_QUERY_URL);
    } else if (!req.headers.cookie) {
      return res.json(MissingCredentialResponse);
    }

    const response = await fetch(NOTICE_LIST_QUERY_URL, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: req.headers.cookie,
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

    if (response.status === 302) return res.json(ExpiredResponse);

    const { data, pageIndex, pageSize, totalCount, totalPage } =
      (await response.json()) as RawNoticeListData;

    if (!data.length)
      throw new Error(`获取公告列表失败: ${JSON.stringify(data, null, 2)}`);

    return res.json({
      success: true,
      data: data.map(getNoticeItem),
      count: totalCount,
      size: pageSize,
      current: pageIndex,
      total: totalPage,
    } as NoticeListSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
