import type { RequestHandler } from "express";
import type { Cookie } from "set-cookie-parser";

import type { LoginFailedResponse, LoginOptions } from "../auth/login.js";
import { WEB_VPN_AUTH_SERVER, login } from "../auth/login.js";
import type { EmptyObject } from "../typings.js";
import {
  IE_8_USER_AGENT,
  getCookieHeader,
  getCookies,
} from "../utils/index.js";

export interface UnderSystemLoginSuccessResponse {
  status: "success";

  cookies: Cookie[];
}

export type UnderSystemLoginResponse =
  | UnderSystemLoginSuccessResponse
  | LoginFailedResponse;

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729; Tablet PC 2.0)",
};

export const underSystemLogin = async (
  options: LoginOptions
): Promise<UnderSystemLoginResponse> => {
  const result = await login(
    options,
    "http://dsjx.nenu.edu.cn:80/Logon.do?method=logonjz",
    true
  );

  if (result.status !== "success") {
    console.error(result.msg);

    return <LoginFailedResponse>{
      status: "failed",
      type: result.type,
      msg: result.msg,
    };
  }

  const authCookies = result.cookies.filter(
    (item) => item.name === "iPlanetDirectoryPro"
  );

  const ticketHeaders = {
    Cookie: getCookieHeader(authCookies),
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
    ticketResponse.status,
    ticketResponse.headers.get("Location"),
    await ticketResponse.text()
  );

  if (ticketResponse.status !== 302)
    return <LoginFailedResponse>{
      status: "failed",
      type: "unknown",
      msg: "登录失败",
    };

  const finalLocation = ticketResponse.headers.get("Location");

  if (finalLocation?.includes(";jsessionid=")) {
    await fetch("https://dsjx.webvpn.nenu.edu.cn/Logon.do?method=logonBySSO", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: getCookieHeader(authCookies),
        Referer: "https://dsjx.webvpn.nenu.edu.cn/framework/main.jsp",
        "User-Agent": IE_8_USER_AGENT,
      },
    });

    return <UnderSystemLoginSuccessResponse>{
      status: "success",
      cookies: authCookies,
    };
  }

  return { status: "failed", type: "unknown", msg: "登录失败" };
};

export const underSystemLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    return res.json(await underSystemLogin(req.body));
  } catch (err) {
    res.json(<LoginFailedResponse>{
      status: "failed",
      msg: (<Error>err).message,
    });
  }
};
