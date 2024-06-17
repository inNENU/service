import type { RequestHandler } from "express";

import { actionLogin } from "./login.js";
import { ACTION_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { ActionFailType } from "../config/actionFailType.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  CommonSuccessResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import type { VPNLoginFailedResult } from "../vpn/login.js";

const BORROW_BOOKS_URL = `${ACTION_SERVER}/basicInfo/getBookBorrow`;

interface RawBorrowBookData extends Record<string, unknown> {
  due_date: string;
  loan_date: string;
  title: string;
  author: string;
  publication_year: string;
  item_barcode: string;
  process_status: "NORMAL" | "RENEW";
  location_code: {
    value: string;
    name: string;
  };
  item_policy: {
    value: string;
    description: string;
  };
  call_number: string;
  last_renew_date: string;
  last_renew_status: {
    value: string;
    desc: string;
  };
  loan_status: "ACTIVE";
}

type RawBorrowBooksData =
  | {
      success: true;
      data: RawBorrowBookData[];
    }
  | {
      success: false;
      data: "";
    };

export interface BorrowBookData {
  /** 书名 */
  name: string;
  /** 作者 */
  author: string;
  /** 出版年份 */
  year: number;
  /** 借阅状态 */
  status: string;
  /** 条形码 */
  barcode: string;
  /** 借出时间 */
  loanDate: string;
  /** 到期时间 */
  dueDate: string;
  /** 位置 */
  location: string;
  /** 书架号 */
  shelfNumber: string;
  /** 是否续借 */
  renew: boolean;
  /** 续借时间 */
  renewTime?: string;
}

const getBookData = ({
  title,
  author,
  loan_date: loanDate,
  due_date: dueDate,
  item_barcode: barcode,
  location_code: locationCode,
  call_number: shelfNumber,
  process_status: status,
  last_renew_date: renewTime,
  item_policy: policy,
  publication_year: year,
}: RawBorrowBookData): BorrowBookData => ({
  name: title,
  author,
  loanDate,
  dueDate,
  year: Number(year),
  barcode,
  location: locationCode.name,
  shelfNumber,
  renew: status === "RENEW",
  renewTime,
  status: policy.description,
});

export type BorrowBooksSuccessResponse = CommonSuccessResponse<
  BorrowBookData[]
>;

export type BorrowBooksResponse =
  | BorrowBooksSuccessResponse
  | AuthLoginFailedResponse
  | VPNLoginFailedResult
  | CommonFailedResponse;

export const borrowBooksHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    if (!req.headers.cookie) {
      if (!req.body.id || !req.body.password)
        throw new Error(`"id" and password" field is required!`);

      const result = await actionLogin(req.body as AccountInfo);

      if (!result.success) return res.json(result);

      req.headers.cookie = result.cookieStore.getHeader(BORROW_BOOKS_URL);
    }

    const response = await fetch(BORROW_BOOKS_URL, {
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: req.headers.cookie,
        Referer: `${ACTION_SERVER}/basicInfo/studentPageTurn?type=lifestudying&tg=bookborrow`,
      },
      redirect: "manual",
    });

    if (response.status === 302)
      return res.json({
        success: false,
        type: ActionFailType.Expired,
        msg: "登录信息已过期，请重新登录",
      } as CommonFailedResponse<ActionFailType.Expired>);

    const data = (await response.json()) as RawBorrowBooksData;

    if (data.success)
      return res.json({
        success: true,
        data: data.data.map(getBookData),
      } as BorrowBooksSuccessResponse);

    return res.json({
      success: true,
      data: [],
    } as BorrowBooksSuccessResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      type: ActionFailType.Unknown,
      msg: message,
    } as CommonFailedResponse);
  }
};
