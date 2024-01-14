import type { RequestHandler } from "express";

import { libraryLogin } from "./login.js";
import { LIBRARY_SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/index.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { EDGE_USER_AGENT_HEADERS } from "../utils/index.js";

interface RawLoanBookData {
  year: string;
  mmsid: string;
  title: string;
  callnumber: string;
  author: string;
  duedate: string;
  loanid: string;
  itemid: string;
  itembarcode: string;
  loandate: string;
  loanstatus: string;
  maxrenewdate: string;
  lastrenewdate?: string;
  rebewstatuses?: {
    renewstatus: string[];
  };
  renew: string;
  duehour: string;
  mainlocationname: string;
  mainlocationcode: string;
  secondarylocationname: string;
  secondarylocationcode: string;
  itemcategoryname: string;
  itemcategorycode: string;
  itemstatusname: string;
  ilsinstitutionname: string;
  alerts: unknown[];
}

interface RawLoanData {
  code: 200;
  msg: string;
  data: {
    data: {
      loans: {
        loan: RawLoanBookData[];
        showmore: ["N"];
        historicloans: "Y";
        hasAlerts: boolean;
      };
    };
  };
}

export interface LoanBookData {
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
  mmsid: string;
  /** 是否续借过 */
  renew: boolean;
  /** 续借时间 */
  renewDate?: string;
}

export interface LibraryLoanSuccessResponse {
  success: true;
  books: LoanBookData[];
}

export type LibraryLoginResponse =
  | LibraryLoanSuccessResponse
  | AuthLoginFailedResult
  | CommonFailedResponse;

const QUERY_URL = `${LIBRARY_SERVER}/discoverySystem/primoVe/loans?lang=zh&offset=1&bulk=100&type=active`;

const getBookData = ({
  title,
  author,
  year,
  itemstatusname,
  itembarcode,
  loandate,
  duedate,
  mainlocationname,
  callnumber,
  mmsid,
  renew,
  lastrenewdate,
}: RawLoanBookData): LoanBookData => ({
  name: title,
  author,
  year: Number(year),
  status: itemstatusname,
  barcode: itembarcode,
  loanDate: loandate,
  dueDate: duedate,
  location: mainlocationname,
  shelfNumber: callnumber,
  mmsid,
  renew: renew === "Y",
  renewDate: lastrenewdate,
});

export const libraryLoanHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    let cookieHeader = req.headers.cookie;

    if (!cookieHeader) {
      if (!req.body.id || !req.body.password)
        return res.json(<CommonFailedResponse>{
          success: false,
          msg: "请提供账号密码",
        });

      const result = await libraryLogin(req.body);

      if (!result.success) return res.json(result);

      cookieHeader = result.cookieStore.getHeader(QUERY_URL);
    }

    const response = await fetch(QUERY_URL, {
      headers: {
        cookie: cookieHeader,
        ...EDGE_USER_AGENT_HEADERS,
      },
    });

    const data = <RawLoanData>await response.json();

    if (data.code !== 200)
      return res.json(<CommonFailedResponse>{
        success: false,
        msg: "查询失败",
      });

    const books = data.data.data.loans.loan.map(getBookData);

    return res.json(<LibraryLoanSuccessResponse>{
      success: true,
      books,
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};
