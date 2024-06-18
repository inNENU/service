import type { CookieType } from "@mptool/net";
import type { RequestHandler } from "express";

import { ACTION_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { WEB_VPN_AUTH_SERVER, authLogin } from "../auth/index.js";
import { UnknownResponse } from "../config/index.js";
import type { AccountInfo, EmptyObject } from "../typings.js";
import { CookieStore } from "../utils/index.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";
import { vpnCASLogin } from "../vpn/index.js";

export interface ActionLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type ActionLoginResult =
  | ActionLoginSuccessResult
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

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

    return result;
  }

  const ticketResponse = await fetch(result.location, {
    headers: {
      Cookie: cookieStore.getHeader(result.location),
      Referer: WEB_VPN_AUTH_SERVER,
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(ticketResponse, result.location);

  if (ticketResponse.status !== 302) return UnknownResponse("登录失败");

  const finalLocation = ticketResponse.headers.get("Location");

  if (finalLocation?.startsWith(`${ACTION_SERVER}/portal_main/toPortalPage`))
    return {
      success: true,
      cookieStore,
    } as ActionLoginResult;

  return UnknownResponse("登录失败");
};

export interface ActionLoginSuccessResponse {
  success: true;
  /** @deprecated */
  cookies: CookieType[];
}

export type ActionLoginResponse =
  | ActionLoginSuccessResponse
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

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

    return res.json(UnknownResponse(message));
  }
};
