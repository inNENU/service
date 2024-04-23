import type { RequestHandler } from "express";

import { actionLogin } from "./login.js";
import { ACTION_SERVER } from "./utils.js";
import type {
  AuthLoginFailedResponse,
  AuthLoginFailedResult,
} from "../auth/index.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";

const NOTICE_LIST_QUERY_URL = `${ACTION_SERVER}/page/queryList`;

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

export interface NoticeListOptions extends Partial<LoginOptions> {
  /** @default 20 */
  limit?: number;
  /** @default 1 */
  page?: number;
  /** @default "notice" */
  type?: "notice" | "news";
}

export interface NoticeItem {
  title: string;
  from: string;
  time: string;
  id: string;
}

const getNoticeItem = ({
  // eslint-disable-next-line @typescript-eslint/naming-convention
  ID__,
  CJBM,
  KEYWORDS_,
  FBSJ,
}: RawNoticeItem): NoticeItem => ({
  title: KEYWORDS_,
  id: ID__,
  time: FBSJ,
  from: CJBM,
});

export interface NoticeListSuccessResponse {
  success: true;
  data: NoticeItem[];
  pageIndex: number;
  pageSize: number;
  totalPage: number;
  totalCount: number;
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
        return res.json({
          success: false,
          msg: "请提供账号密码",
        } as CommonFailedResponse);

      const result = await actionLogin(req.body as LoginOptions);

      if (!result.success) return res.json(result);

      cookieHeader = result.cookieStore.getHeader(NOTICE_LIST_QUERY_URL);
    }

    const { limit = 20, page = 1, type = "notice" } = req.body;

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
        limit: limit.toString(),
        page: page.toString(),
      }),
      redirect: "manual",
    });

    if (response.status === 302)
      return res.json({
        success: false,
        type: LoginFailType.Expired,
        msg: "登录信息已过期，请重新登录",
      } as AuthLoginFailedResponse);

    const { data, pageIndex, pageSize, totalCount, totalPage } =
      (await response.json()) as RawNoticeListData;

    if (data.length)
      return res.json({
        success: true,
        data: data.map(getNoticeItem),
        pageIndex,
        pageSize,
        totalCount,
        totalPage,
      } as NoticeListSuccessResponse);

    return res.json({
      success: false,
      msg: JSON.stringify(data),
    } as AuthLoginFailedResult);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);
    res.json({
      success: false,
      msg: message,
    } as AuthLoginFailedResult);
  }
};
