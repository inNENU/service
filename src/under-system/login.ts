import type { RequestHandler } from "express";

import { SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/login.js";
import { authLogin } from "../auth/login.js";
import { WEB_VPN_AUTH_SERVER } from "../auth/utils.js";
import type { CookieType, EmptyObject, LoginOptions } from "../typings.js";
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
  options: LoginOptions,
  cookieStore = new CookieStore(),
): Promise<UnderSystemLoginResult> => {
  const vpnLoginResult = await vpnCASLogin(options, cookieStore);

  if (!vpnLoginResult.success) return vpnLoginResult;

  const result = await authLogin(options, {
    service: "http://dsjx.nenu.edu.cn:80/",
    webVPN: true,
    cookieStore,
  });

  if (!result.success) {
    console.error(result.msg);

    return <AuthLoginFailedResult>{
      success: false,
      type: result.type,
      msg: result.msg,
    };
  }

  const ticketHeaders = {
    Cookie: cookieStore.getHeader(result.location),
    Referer: WEB_VPN_AUTH_SERVER,
    ...COMMON_HEADERS,
  };

  console.log("ticket headers", ticketHeaders);

  const ticketResponse = await fetch(result.location, {
    headers: new Headers(ticketHeaders),
    redirect: "manual",
  });

  cookieStore.applyResponse(ticketResponse, result.location);

  console.log(
    "ticket",
    ticketResponse.headers.get("Location"),
    await ticketResponse.text(),
  );

  if (ticketResponse.status !== 302)
    return <AuthLoginFailedResult>{
      success: false,
      type: "unknown",
      msg: "登录失败",
    };

  const finalLocation = ticketResponse.headers.get("Location");

  if (finalLocation?.includes(";jsessionid=")) {
    const ssoUrl = `${SERVER}/Logon.do?method=logonBySSO`;

    await fetch(ssoUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieStore.getHeader(ssoUrl),
        Referer: `${SERVER}/framework/main.jsp`,
        "User-Agent": IE_8_USER_AGENT,
      },
    });

    return <UnderSystemLoginSuccessResult>{
      success: true,
      cookieStore,
    };
  }

  return {
    success: false,
    type: "unknown",
    msg: "登录失败",
  };
};

export interface UnderSystemLoginSuccessResponse {
  success: true;
  cookies: CookieType[];
}

export type UnderSystemLoginResponse =
  | UnderSystemLoginSuccessResponse
  | AuthLoginFailedResult
  | VPNLoginFailedResult;

export const underSystemLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const result = await underSystemLogin(req.body);

    if (result.success)
      return res.json(<UnderSystemLoginSuccessResponse>{
        success: true,
        cookies: result.cookieStore
          .getAllCookies()
          .map((item) => item.toJSON()),
      });

    return res.json(result);
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};
