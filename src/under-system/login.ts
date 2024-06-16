import type { CookieType } from "@mptool/net";
import type { RequestHandler } from "express";

import { UNDER_SYSTEM_SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/login.js";
import { authLogin } from "../auth/login.js";
import { WEB_VPN_AUTH_SERVER } from "../auth/utils.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type { AccountInfo, EmptyObject } from "../typings.js";
import { CookieStore, IE_8_USER_AGENT } from "../utils/index.js";
import type { VPNLoginFailedResult } from "../vpn/login.js";
import { vpnCASLogin } from "../vpn/login.js";

export interface UnderSystemLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type UnderSystemLoginResult =
  | UnderSystemLoginSuccessResult
  | AuthLoginFailedResult
  | VPNLoginFailedResult;

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
    } as AuthLoginFailedResult;
  }

  console.log("Login location", result.location);

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
    console.log("ticket response", await ticketResponse.text());

    return {
      success: false,
      type: LoginFailType.Unknown,
      msg: "登录失败",
    };
  }

  const finalLocation = ticketResponse.headers.get("Location");

  console.log("location: ", finalLocation);

  if (finalLocation?.includes("http://wafnenu.nenu.edu.cn/offCampus.html"))
    return {
      success: false,
      type: LoginFailType.Forbidden,
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
    } as UnderSystemLoginSuccessResult;
  }

  return {
    success: false,
    type: LoginFailType.Unknown,
    msg: "登录失败",
  };
};

export interface UnderSystemLoginSuccessResponse {
  success: true;
  /** @deprecated */
  cookies: CookieType[];
}

export type UnderSystemLoginResponse =
  | UnderSystemLoginSuccessResponse
  | AuthLoginFailedResult
  | VPNLoginFailedResult;

export const underSystemLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  AccountInfo
> = async (req, res) => {
  try {
    const result = await underSystemLogin(req.body);

    if (result.success) {
      const cookies = result.cookieStore
        .getAllCookies()
        .map((item) => item.toJSON());

      cookies.forEach(({ name, value, ...rest }) => {
        res.cookie(name, value, rest);
      });

      return res.json({
        success: true,
        cookies,
      } as UnderSystemLoginSuccessResponse);
    }

    return res.json(result);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);
    res.json({
      success: false,
      msg: message,
    } as AuthLoginFailedResult);
  }
};
