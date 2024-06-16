import type { CookieType } from "@mptool/net";
import type { RequestHandler } from "express";

import { ACTION_SERVER } from "./utils.js";
import { WEB_VPN_AUTH_SERVER, authLogin } from "../auth/index.js";
import type { AuthLoginFailedResult } from "../auth/login.js";
import type { AccountInfo, EmptyObject } from "../typings.js";
import { CookieStore } from "../utils/index.js";
import type { VPNLoginFailedResult } from "../vpn/login.js";
import { vpnCASLogin } from "../vpn/login.js";

export interface ActionLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type ActionLoginResult =
  | ActionLoginSuccessResult
  | AuthLoginFailedResult
  | VPNLoginFailedResult;

export const actionLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<ActionLoginResult> => {
  const vpnLoginResult = await vpnCASLogin(options, cookieStore);

  if (!vpnLoginResult.success) return vpnLoginResult;

  const result = await authLogin({
    ...options,
    service: `${ACTION_SERVER}/portal_main/toPortalPage`,
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

  const ticketResponse = await fetch(result.location, {
    headers: {
      Cookie: cookieStore.getHeader(result.location),
      Referer: WEB_VPN_AUTH_SERVER,
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(ticketResponse, result.location);

  if (ticketResponse.status !== 302)
    return {
      success: false,
      type: "unknown",
      msg: "登录失败",
    } as AuthLoginFailedResult;

  const finalLocation = ticketResponse.headers.get("Location");

  if (finalLocation?.startsWith(`${ACTION_SERVER}/portal_main/toPortalPage`))
    return {
      success: true,
      cookieStore,
    } as ActionLoginResult;

  return {
    success: false,
    type: "unknown",
    msg: "登录失败",
  } as AuthLoginFailedResult;
};

export interface ActionLoginSuccessResponse {
  success: true;
  /** @deprecated */
  cookies: CookieType[];
}

export type ActionLoginResponse =
  | ActionLoginSuccessResponse
  | AuthLoginFailedResult
  | VPNLoginFailedResult;

export const actionLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  AccountInfo
> = async (req, res) => {
  try {
    const result = await actionLogin(req.body);

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
      } as ActionLoginSuccessResponse);
    }

    return res.json(result);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      msg: message,
    } as AuthLoginFailedResult);
  }
};
