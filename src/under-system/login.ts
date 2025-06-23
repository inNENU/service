import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import { UNDER_SYSTEM_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/login.js";
import { authLogin } from "../auth/login.js";
import { WEB_VPN_AUTH_SERVER } from "../auth/utils.js";
import {
  ActionFailType,
  MissingCredentialResponse,
  TEST_ID_NUMBER,
  TEST_LOGIN_RESULT,
} from "../config/index.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  LoginOptions,
} from "../typings.js";
import { IE_8_USER_AGENT, request } from "../utils/index.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";
import { vpnCASLogin } from "../vpn/index.js";

export interface UnderSystemLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type UnderSystemLoginResult =
  | UnderSystemLoginSuccessResult
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729; Tablet PC 2.0)",
};

export const underSystemLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<UnderSystemLoginResult> => {
  const vpnLoginResult = await vpnCASLogin(options, cookieStore);

  if (!vpnLoginResult.success) return vpnLoginResult;

  const result = await authLogin({
    ...options,
    service: "http://dsjx.nenu.edu.cn:80/",
    webVPN: true,
    cookieStore,
  });

  if (!result.success) {
    console.error(result.msg);

    return {
      success: false,
      type: result.type,
      msg: result.msg,
    } as AuthLoginFailedResponse;
  }

  const ticketResponse = await fetch(result.location, {
    headers: {
      Cookie: cookieStore.getHeader(result.location),
      Referer: WEB_VPN_AUTH_SERVER,
      ...COMMON_HEADERS,
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(ticketResponse, result.location);

  if (ticketResponse.status !== 302) {
    return {
      success: false,
      type: ActionFailType.Unknown,
      msg: "登录失败",
    };
  }

  const finalLocation = ticketResponse.headers.get("Location");

  if (finalLocation?.includes("http://wafnenu.nenu.edu.cn/offCampus.html"))
    return {
      success: false,
      type: ActionFailType.Forbidden,
      msg: "此账户无法登录本科教学服务系统",
    };

  if (finalLocation?.includes(";jsessionid=")) {
    const ssoUrl = `${UNDER_SYSTEM_SERVER}/Logon.do?method=logonBySSO`;

    await fetch(ssoUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieStore.getHeader(ssoUrl),
        Referer: `${UNDER_SYSTEM_SERVER}/framework/main.jsp`,
        "User-Agent": IE_8_USER_AGENT,
      },
    });

    return {
      success: true,
      cookieStore,
    };
  }

  return {
    success: false,
    type: ActionFailType.Unknown,
    msg: "登录失败",
  };
};

export interface UnderSystemLoginSuccessResponse {
  success: true;
  cookies: CookieType[];
}

export type UnderSystemLoginResponse =
  | UnderSystemLoginSuccessResponse
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

export const loginToUnderSystem = request<
  | UnderSystemLoginResponse
  | CommonFailedResponse<ActionFailType.MissingCredential>,
  LoginOptions
>(async (req, res, next) => {
  if (!req.body) {
    return res.json(MissingCredentialResponse);
  }

  const { id, password, authToken } = req.body;

  if (id && password && authToken) {
    const result = await underSystemLogin({ id, password, authToken });

    if (!result.success) return res.json(result);

    req.headers.cookie = result.cookieStore.getHeader(UNDER_SYSTEM_SERVER);
  } else if (!req.headers.cookie) {
    return res.json(MissingCredentialResponse);
  }

  return next();
});

export const underSystemLoginHandler = request<
  UnderSystemLoginResponse,
  AccountInfo
>(async (req, res) => {
  const result = // fake result for testing
    req.body.id === TEST_ID_NUMBER
      ? TEST_LOGIN_RESULT
      : await underSystemLogin(req.body);

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
});
