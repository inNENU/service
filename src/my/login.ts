import type { CookieType } from "@mptool/net";
import type { RequestHandler } from "express";

import { MY_MAIN_PAGE } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/login.js";
import { authLogin } from "../auth/login.js";
import { WEB_VPN_AUTH_SERVER } from "../auth/utils.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type { AccountInfo, EmptyObject } from "../typings.js";
import { CookieStore } from "../utils/index.js";
import type { VPNLoginFailedResult } from "../vpn/login.js";
import { vpnCASLogin } from "../vpn/login.js";

export interface MyLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type MyLoginFailedResult = AuthLoginFailedResult | VPNLoginFailedResult;

export type MyLoginResult = MyLoginSuccessResult | MyLoginFailedResult;

export const myLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<MyLoginResult> => {
  const vpnLoginResult = await vpnCASLogin(options, cookieStore);

  if (!vpnLoginResult.success) return vpnLoginResult;

  const result = await authLogin({
    ...options,
    service: MY_MAIN_PAGE,
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

  const ticketUrl = result.location;
  const ticketResponse = await fetch(ticketUrl, {
    headers: {
      Cookie: cookieStore.getHeader(ticketUrl),
      Referer: WEB_VPN_AUTH_SERVER,
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(ticketResponse, ticketUrl);

  console.log(
    "ticket",
    ticketResponse.headers.get("Location"),
    await ticketResponse.text(),
  );

  if (ticketResponse.status !== 302)
    return {
      success: false,
      type: LoginFailType.Unknown,
      msg: "登录失败",
    } as AuthLoginFailedResult;

  const sessionLocation = ticketResponse.headers.get("Location");

  if (sessionLocation?.includes("jsessionid=")) {
    const mainResponse = await fetch(sessionLocation, {
      headers: {
        Cookie: cookieStore.getHeader(ticketUrl),
        Referer: WEB_VPN_AUTH_SERVER,
      },
      redirect: "manual",
    });

    cookieStore.applyResponse(mainResponse, sessionLocation);

    const content = await mainResponse.text();

    if (content.includes("<title>网上服务大厅</title>"))
      return {
        success: true,
        cookieStore,
      } as MyLoginResult;
  }

  return {
    success: false,
    type: LoginFailType.Unknown,
    msg: "登录失败",
  } as AuthLoginFailedResult;
};

export interface MyLoginSuccessResponse {
  success: true;
  /** @deprecated */
  cookies: CookieType[];
}

export type MyLoginResponse = MyLoginSuccessResponse | MyLoginFailedResult;

export const myLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  AccountInfo
> = async (req, res) => {
  try {
    const result = await myLogin(req.body);

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
      } as MyLoginSuccessResponse);
    }

    return res.json(result);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      msg: message,
    } as MyLoginFailedResult);
  }
};
