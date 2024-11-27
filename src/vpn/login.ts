import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import { LOGIN_URL, UPDATE_KEY_URL, VPN_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/login.js";
import { ActionFailType, UnknownResponse } from "../config/index.js";
import type { AccountInfo, CommonFailedResponse } from "../typings.js";
import { request } from "../utils/index.js";

const AUTHENTICITY_TOKEN_REGEXP =
  /<input\s+type="hidden"\s+name="authenticity_token" value="(.*?)" \/>/;

export interface VPNLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type VPNLoginFailedResponse = CommonFailedResponse<
  | ActionFailType.AccountLocked
  | ActionFailType.WrongPassword
  | ActionFailType.Error
  | ActionFailType.Unknown
>;

export type VPNLoginResult =
  | VPNLoginSuccessResult
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

export const vpnLogin = async (
  { id, password }: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<VPNLoginResult> => {
  const loginPageResponse = await fetch(LOGIN_URL);

  cookieStore.applyResponse(loginPageResponse, VPN_SERVER);

  const content = await loginPageResponse.text();

  const authenticityToken = AUTHENTICITY_TOKEN_REGEXP.exec(content)![1];

  const params = new URLSearchParams({
    utf8: "✓",
    authenticity_token: authenticityToken,
    "user[login]": id.toString(),
    "user[password]": password,
    "user[dymatice_code]": "unknown",
    "user[otp_with_capcha]": "false",
    commit: "登录 Login",
  });

  const loginResponse = await fetch(LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieStore.getHeader(LOGIN_URL),
    },
    body: params.toString(),
    redirect: "manual",
  });

  const location = loginResponse.headers.get("Location");

  cookieStore.applyResponse(loginResponse, VPN_SERVER);

  if (loginResponse.status === 302) {
    if (location === LOGIN_URL)
      return {
        success: false,
        type: ActionFailType.AccountLocked,
        msg: "短时间内登录过多，小程序服务器已被屏蔽。请稍后重试",
      };

    if (location === UPDATE_KEY_URL) {
      const keyResponse = await fetch(UPDATE_KEY_URL, {
        headers: {
          Cookie: cookieStore.getHeader(UPDATE_KEY_URL),
        },
      });

      cookieStore.applyResponse(keyResponse, VPN_SERVER);

      return {
        success: true,
        cookieStore,
      };
    }
  }

  if (loginResponse.status === 200) {
    const response = await loginResponse.text();

    if (response.includes("用户名或密码错误, 超过五次将被锁定。"))
      return {
        success: false,
        type: ActionFailType.WrongPassword,
        msg: "用户名或密码错误, 超过五次将被锁定。",
      };

    if (response.includes("您的帐号已被锁定, 请在十分钟后再尝试。"))
      return {
        success: false,
        type: ActionFailType.AccountLocked,
        msg: "您的帐号已被锁定, 请在十分钟后再尝试。",
      };
  }

  console.error("Unknown VPN login response:", await loginResponse.text());

  return UnknownResponse("未知错误");
};

export interface VPNLoginSuccessResponse {
  success: true;
  cookies: CookieType[];
}

export type VPNLoginResponse =
  | VPNLoginSuccessResponse
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

export const vpnLoginHandler = request<VPNLoginResponse, AccountInfo>(
  async (req, res) => {
    const { id, password, authToken } = req.body;

    const result = await vpnLogin({ id, password, authToken });

    if (result.success) {
      const cookies = result.cookieStore
        .getAllCookies()
        .map((item) => item.toJSON());

      cookies.forEach(({ name, value, ...rest }) => {
        res.cookie(name, value, rest);
      });

      return res.json({ success: true, cookies });
    }

    return res.json(result);
  },
);
