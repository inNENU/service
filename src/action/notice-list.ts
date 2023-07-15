import type { RequestHandler } from "express";

import { actionLogin } from "./login.js";
import { SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import type {
  CommonFailedResponse,
  Cookie,
  CookieOptions,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { getCookieHeader } from "../utils/index.js";

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

export type NoticeListOptions = (LoginOptions | CookieOptions) & {
  /** @default 20 */
  limit?: number;
  /** @default 1 */
  page?: number;
  /** @default "notice" */
  type?: "notice" | "news";
};

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
    const { limit = 20, page = 1, type = "notice" } = req.body;
    let cookies: Cookie[] = [];

    if ("cookies" in req.body) {
      ({ cookies } = req.body);
    } else {
      const result = await actionLogin(req.body);

      if (!result.success) return res.json(result);

      ({ cookies } = result);
    }

    const headers = {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: getCookieHeader(cookies),
      Referer: `${SERVER}/basicInfo/studentPageTurn?type=lifeschool`,
    };

    const params = new URLSearchParams({
      type,
      _search: "false",
      nd: new Date().getTime().toString(),
      limit: limit.toString(),
      page: page.toString(),
    });

    const response = await fetch(`${SERVER}/page/queryList`, {
      method: "POST",
      headers,
      body: params.toString(),
    });

    const { data, pageIndex, pageSize, totalCount, totalPage } = <
      RawNoticeListData
    >await response.json();

    if (data.length)
      return res.json(<NoticeListSuccessResponse>{
        success: true,
        data: data.map(getNoticeItem),
        pageIndex,
        pageSize,
        totalCount,
        totalPage,
      });

    return res.json(<AuthLoginFailedResponse>{
      success: false,
      msg: JSON.stringify(data),
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
