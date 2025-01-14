import type { BorrowBookData, RawBorrowBooksData } from "./converter.js";
import { getBorrowBookData } from "./converter.js";
import type { AuthLoginFailedResponse } from "../../auth/index.js";
import type { ActionFailType } from "../../config/index.js";
import { ExpiredResponse } from "../../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import type { VPNLoginFailedResponse } from "../../vpn/index.js";
import { ACTION_SERVER } from "../utils.js";

const BORROW_BOOKS_URL = `${ACTION_SERVER}/basicInfo/getBookBorrow`;

export type BorrowBooksSuccessResponse = CommonSuccessResponse<
  BorrowBookData[]
>;

export type BorrowBooksResponse =
  | BorrowBooksSuccessResponse
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse
  | CommonFailedResponse<ActionFailType.Expired | ActionFailType.Unknown>;

export const getBorrowBooks = async (
  cookieHeader: string,
): Promise<BorrowBooksResponse> => {
  const response = await fetch(BORROW_BOOKS_URL, {
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      Referer: `${ACTION_SERVER}/basicInfo/studentPageTurn?type=lifestudying&tg=bookborrow`,
    },
    redirect: "manual",
  });

  if (response.status === 302) return ExpiredResponse;

  const data = (await response.json()) as RawBorrowBooksData;

  return {
    success: true,
    data: data.success ? data.data.map(getBorrowBookData) : [],
  };
};
