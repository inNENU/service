import { request } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../auth/index.js";
import { expiredResponse, unknownResponse } from "../config/index.js";
import type { CommonSuccessResponse, LoginOptions } from "../typings.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";
import { ACTION_LOGIN_ENDPOINT, ACTION_ENDPOINT } from "./utils.js";

interface RawEmailPageResponse {
  ok: boolean;
  data: string;
}

export type ActionEmailPageSuccessResponse = CommonSuccessResponse<string>;

export type ActionEmailPageResponse =
  | ActionEmailPageSuccessResponse
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

const TEST_EMAIL_PAGE_RESPONSE: ActionEmailPageSuccessResponse = {
  success: true,
  data: "https://www.example.com",
};

export const getEmailPage = async (cookieHeader: string): Promise<ActionEmailPageResponse> => {
  const response = await fetch(ACTION_ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      "Content-Type": "application/json; charset=UTF-8",
      Cookie: cookieHeader,
      Referer: ACTION_LOGIN_ENDPOINT,
    },
    body: JSON.stringify({ action: "getMidUrl" }),
    redirect: "manual",
  });

  if (response.status === 302) return expiredResponse;

  const result = (await response.json()) as RawEmailPageResponse;

  if (!result.ok) return unknownResponse("获取邮件页面失败");

  return {
    success: true,
    data: result.data,
  };
};

export const actionEmailPageHandler = request<ActionEmailPageResponse, LoginOptions, LoginOptions>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(TEST_EMAIL_PAGE_RESPONSE);

    return res.json(await getEmailPage(cookieHeader));
  },
);
