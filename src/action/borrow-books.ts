import type { RequestHandler } from "express";

import { actionLogin } from "./login.js";
import { ACTION_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type {
  AccountInfo,
  CommonFailedResponse,
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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  loan_date,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  due_date,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  item_barcode,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  location_code,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  call_number,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  process_status,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  last_renew_date,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  item_policy,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  publication_year,
}: RawBorrowBookData): BorrowBookData => ({
  name: title,
  author,
  loanDate: loan_date,
  dueDate: due_date,
  year: Number(publication_year),
  barcode: item_barcode,
  location: location_code.name,
  shelfNumber: call_number,
  renew: process_status === "RENEW",
  renewTime: last_renew_date,
  status: item_policy.description,
});

export interface BorrowBooksSuccessResponse {
  success: true;
  data: BorrowBookData[];
}

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
        return res.json({
          success: false,
          msg: "请提供账号密码",
        } as CommonFailedResponse);

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
        type: LoginFailType.Expired,
        msg: "登录信息已过期，请重新登录",
      } as AuthLoginFailedResponse);

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
    res.json({
      success: false,
      msg: message,
    } as CommonFailedResponse);
  }
};
