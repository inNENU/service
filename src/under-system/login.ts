import type { RequestHandler } from "express";

import { SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/login.js";
import { authLogin } from "../auth/login.js";
import { WEB_VPN_AUTH_SERVER } from "../auth/utils.js";
import type { Cookie, EmptyObject, LoginOptions } from "../typings.js";
import {
  IE_8_USER_AGENT,
  getCookieHeader,
  getCookies,
} from "../utils/index.js";
import type { VPNLoginFailedResponse } from "../vpn/login.js";
import { vpnCASLogin } from "../vpn/login.js";

export interface UnderSystemLoginSuccessResponse {
  success: true;
  /** @deprecated */
  status: "success";

  cookies: Cookie[];
}

export type UnderSystemLoginResponse =
  | UnderSystemLoginSuccessResponse
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729; Tablet PC 2.0)",
};

export const underSystemLogin = async (
  options: LoginOptions,
): Promise<UnderSystemLoginResponse> => {
  const vpnLoginResult = await vpnCASLogin(options);

  if (!vpnLoginResult.success) return vpnLoginResult;

  const result = await authLogin(options, {
    service: "http://dsjx.nenu.edu.cn:80/",
    webVPN: true,
    cookies: vpnLoginResult.cookies,
  });

  if (!result.success) {
    console.error(result.msg);

    return <AuthLoginFailedResponse>{
      success: false,
      status: "failed",
      type: result.type,
      msg: result.msg,
    };
  }

  const authCookies = vpnLoginResult.cookies;

  const authCookie = result.cookies.find(
    (item) => item.name === "iPlanetDirectoryPro",
  );

  if (authCookie) authCookies.push(authCookie);

  const ticketHeaders = {
    Cookie: getCookieHeader([...vpnLoginResult.cookies, ...authCookies]),
    Referer: WEB_VPN_AUTH_SERVER,
    ...COMMON_HEADERS,
  };

  console.log("ticket headers", ticketHeaders);

  const ticketResponse = await fetch(result.location, {
    headers: new Headers(ticketHeaders),
    redirect: "manual",
  });

  authCookies.push(...getCookies(ticketResponse));

  console.log(
    "ticket",
    ticketResponse.headers.get("Location"),
    await ticketResponse.text(),
  );

  if (ticketResponse.status !== 302)
    return <AuthLoginFailedResponse>{
      success: false,
      status: "failed",
      type: "unknown",
      msg: "登录失败",
    };

  const finalLocation = ticketResponse.headers.get("Location");

  if (finalLocation?.includes(";jsessionid=")) {
    await fetch(`${SERVER}/Logon.do?method=logonBySSO`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: getCookieHeader(authCookies),
        Referer: `${SERVER}/framework/main.jsp`,
        "User-Agent": IE_8_USER_AGENT,
      },
    });

    return <UnderSystemLoginSuccessResponse>{
      success: true,
      status: "success",
      cookies: authCookies,
    };
  }

  return {
    success: false,
    status: "failed",
    type: "unknown",
    msg: "登录失败",
  };
};

export const underSystemLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    return res.json(await underSystemLogin(req.body));
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResponse>{
      success: false,
      status: "failed",
      msg: message,
    });
  }
};
