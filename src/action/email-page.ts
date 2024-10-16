import { ACTION_MAIN_PAGE, ACTION_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/login.js";
import type { ActionFailType } from "../config/index.js";
import { ExpiredResponse, UnknownResponse } from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  LoginOptions,
} from "../typings.js";
import { request } from "../utils/index.js";
import type { VPNLoginFailedResponse } from "../vpn/login.js";

const EMAIL_PAGE_URL = `${ACTION_SERVER}/extract/sendRedirect2Email`;
const EMAIL_URL = `${ACTION_SERVER}/extract/sendRedirect2EmailPage`;

export interface ActionEmailPageOptions extends LoginOptions {
  /** 邮件 ID */
  mid?: string;
}

interface RawEmailPageResponse {
  success: boolean;
  url: string;
}

export type ActionEmailPageSuccessResponse = CommonSuccessResponse<string>;

export type ActionEmailPageResponse =
  | ActionEmailPageSuccessResponse
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse
  | CommonFailedResponse<ActionFailType.Expired | ActionFailType.Unknown>;

const TEST_EMAIL_PAGE_RESPONSE: ActionEmailPageSuccessResponse = {
  success: true,
  data: "https://www.example.com",
};

export const getEmailPage = async (
  cookieHeader: string,
  mid?: string,
): Promise<ActionEmailPageResponse> => {
  const response = await fetch(mid ? EMAIL_PAGE_URL : EMAIL_URL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: cookieHeader,
      Referer: ACTION_MAIN_PAGE,
    },
    body: new URLSearchParams({
      ...(mid ? { domain: "nenu.edu.cn", mid } : {}),
      account_name: "",
    }),
    redirect: "manual",
  });

  if (response.status === 302) {
    return ExpiredResponse;
  }

  const result = (await response.json()) as RawEmailPageResponse;

  if (!result.success) return UnknownResponse("获取邮件页面失败");

  return {
    success: true,
    data: result.url,
  };
};

export const actionEmailPageHandler = request<
  ActionEmailPageResponse,
  ActionEmailPageOptions,
  ActionEmailPageOptions
>(async (req, res) => {
  const cookieHeader = req.headers.cookie!;

  if (cookieHeader.includes("TEST")) return res.json(TEST_EMAIL_PAGE_RESPONSE);

  return res.json(await getEmailPage(cookieHeader, req.body.mid));
});
