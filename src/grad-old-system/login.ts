import type { RequestHandler } from "express";

import {
  GRAD_OLD_SYSTEM_HTTPS_SERVER,
  GRAD_OLD_SYSTEM_HTTP_SERVER,
} from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/login.js";
import { authLogin } from "../auth/login.js";
import { AUTH_SERVER } from "../auth/utils.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type { CookieType, EmptyObject, LoginOptions } from "../typings.js";
import { CookieStore, IE_8_USER_AGENT } from "../utils/index.js";
import type { VPNLoginFailedResult } from "../vpn/login.js";

export interface GradSystemLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type GradSystemLoginResult =
  | GradSystemLoginSuccessResult
  | AuthLoginFailedResult
  | VPNLoginFailedResult;

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729; Tablet PC 2.0)",
};

export const gradOldSystemLogin = async (
  options: LoginOptions,
  cookieStore = new CookieStore(),
): Promise<GradSystemLoginResult> => {
  const result = await authLogin({
    ...options,
    service: `${GRAD_OLD_SYSTEM_HTTP_SERVER}/`,
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
      Referer: AUTH_SERVER,
      ...COMMON_HEADERS,
    },
    redirect: "manual",
  });

  if (ticketResponse.status === 502)
    return {
      success: false,
      type: LoginFailType.Unknown,
      msg: "学校服务器已崩溃，请稍后重试",
    };

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
      msg: "此账户无法登录研究生教学服务系统",
    };

  if (
    finalLocation?.startsWith(GRAD_OLD_SYSTEM_HTTP_SERVER) ??
    finalLocation?.startsWith(GRAD_OLD_SYSTEM_HTTPS_SERVER)
  ) {
    const mainResponse = await fetch(finalLocation, {
      method: "GET",
      headers: {
        Cookie: cookieStore.getHeader(finalLocation),
        Referer: `${GRAD_OLD_SYSTEM_HTTPS_SERVER}/`,
        "User-Agent": IE_8_USER_AGENT,
      },
      redirect: "manual",
    });

    const location = mainResponse.headers.get("Location");

    if (
      location === `${GRAD_OLD_SYSTEM_HTTP_SERVER}/framework/main.jsp` ||
      location === `${GRAD_OLD_SYSTEM_HTTPS_SERVER}/framework/main.jsp`
    ) {
      const ssoUrl = `${GRAD_OLD_SYSTEM_HTTPS_SERVER}/Logon.do?method=logonBySSO`;

      await fetch(ssoUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookieStore.getHeader(ssoUrl),
          Referer: `${GRAD_OLD_SYSTEM_HTTPS_SERVER}/framework/main.jsp`,
          "User-Agent": IE_8_USER_AGENT,
        },
      });

      return {
        success: true,
        cookieStore,
      } as GradSystemLoginSuccessResult;
    }
  }

  return {
    success: false,
    type: LoginFailType.Unknown,
    msg: "登录失败",
  };
};

export interface GradSystemLoginSuccessResponse {
  success: true;
  /** @deprecated */
  cookies: CookieType[];
}

export type GradSystemLoginResponse =
  | GradSystemLoginSuccessResponse
  | AuthLoginFailedResult
  | VPNLoginFailedResult;

export const gradOldSystemLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const result = await gradOldSystemLogin(req.body);

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
      } as GradSystemLoginSuccessResponse);
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
