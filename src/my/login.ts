import type { RequestHandler } from "express";

import { MAIN_PAGE } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/login.js";
import { authLogin } from "../auth/login.js";
import { WEB_VPN_AUTH_SERVER } from "../auth/utils.js";
import type { CookieType, EmptyObject, LoginOptions } from "../typings.js";
import { CookieStore } from "../utils/index.js";
import type { VPNLoginFailedResult } from "../vpn/login.js";
import { vpnCASLogin } from "../vpn/login.js";

export interface ActionLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
  identify: string;
  orgCode: number;
}

export type ActionLoginResult =
  | ActionLoginSuccessResult
  | AuthLoginFailedResult
  | VPNLoginFailedResult;

export const myLogin = async (
  options: LoginOptions,
  cookieStore = new CookieStore(),
): Promise<ActionLoginResult> => {
  const vpnLoginResult = await vpnCASLogin(options, cookieStore);

  if (!vpnLoginResult.success) return vpnLoginResult;

  const result = await authLogin(options, {
    service: MAIN_PAGE,
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
    return <AuthLoginFailedResult>{
      success: false,
      type: "unknown",
      msg: "登录失败",
    };

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
      return <ActionLoginResult>{
        success: true,
        identify: /"ID":"(.*?)","ISFIELDROLE"/.exec(content)![1],
        orgCode: Number(/"ORGCODE":"(\d+)",/.exec(content)![1]),
        cookieStore,
      };
  }

  return <AuthLoginFailedResult>{
    success: false,
    type: "unknown",
    msg: "登录失败",
  };
};

export interface ActionLoginSuccessResponse {
  success: true;
  /** @deprecated */
  cookies: CookieType[];
  identify: string;
  orgCode: number;
}

export type ActionLoginResponse =
  | ActionLoginSuccessResponse
  | AuthLoginFailedResult
  | VPNLoginFailedResult;

export const myLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
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

      return res.json(<ActionLoginSuccessResponse>{
        success: true,
        cookies,
        orgCode: result.orgCode,
        identify: result.identify,
      });
    }

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
