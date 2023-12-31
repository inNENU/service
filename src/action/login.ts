import type { RequestHandler } from "express";

import { ACTION_SERVER } from "./utils.js";
import { WEB_VPN_AUTH_SERVER, authLogin } from "../auth/index.js";
import type { AuthLoginFailedResult } from "../auth/login.js";
import type { CookieType, EmptyObject, LoginOptions } from "../typings.js";
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
  options: LoginOptions,
  cookieStore = new CookieStore(),
): Promise<ActionLoginResult> => {
  const vpnLoginResult = await vpnCASLogin(options, cookieStore);

  if (!vpnLoginResult.success) return vpnLoginResult;

  const result = await authLogin(options, {
    service: `${ACTION_SERVER}/portal_main/toPortalPage`,
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

  const ticketResponse = await fetch(result.location, {
    headers: {
      Cookie: cookieStore.getHeader(result.location),
      Referer: WEB_VPN_AUTH_SERVER,
    },
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

  if (finalLocation?.startsWith(`${ACTION_SERVER}/portal_main/toPortalPage`))
    return <ActionLoginResult>{
      success: true,
      cookieStore,
    };

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
}

export type ActionLoginResponse =
  | ActionLoginSuccessResponse
  | AuthLoginFailedResult
  | VPNLoginFailedResult;

export const actionLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
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

      return res.json(<ActionLoginSuccessResponse>{
        success: true,
        cookies,
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
