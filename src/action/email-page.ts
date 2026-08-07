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
  // getMidUrl 首次调用仅完成会话初始化（返回空响应），需再次调用才返回 SSO 登录 URL
  for (let i = 0; i < 3; i += 1) {
    // oxlint-disable-next-line no-await-in-loop
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

    // oxlint-disable-next-line no-await-in-loop
    const text = await response.text();

    if (!text.trim()) continue; // 空响应说明仍在初始化，重试

    const result = JSON.parse(text) as RawEmailPageResponse;

    if (!result.ok) return unknownResponse("获取邮件页面失败");

    return {
      success: true,
      data: result.data,
    };
  }

  return unknownResponse("获取邮件页面失败");
};

export const actionEmailPageHandler = request<ActionEmailPageResponse, LoginOptions, LoginOptions>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie!;

    if (cookieHeader.includes("TEST")) return res.json(TEST_EMAIL_PAGE_RESPONSE);

    return res.json(await getEmailPage(cookieHeader));
  },
);
