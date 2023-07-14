import type { RequestHandler } from "express";
import type { Cookie } from "set-cookie-parser";

import { SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/login.js";
import { authLogin } from "../auth/login.js";
import { WEB_VPN_AUTH_SERVER } from "../auth/utils.js";
import type { EmptyObject, LoginOptions } from "../typings.js";
import { getCookieHeader, getCookies } from "../utils/index.js";
import type { VPNLoginFailedResponse } from "../vpn/login.js";
import { vpnCASLogin } from "../vpn/login.js";

export interface ActionLoginSuccessResponse {
  success: true;
  /** @deprecated */
  status: "success";

  cookies: Cookie[];
}

export type ActionLoginResponse =
  | ActionLoginSuccessResponse
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

export const actionLogin = async (
  options: LoginOptions,
): Promise<ActionLoginResponse> => {
  const vpnLoginResult = await vpnCASLogin(options);

  if (!vpnLoginResult.success) return vpnLoginResult;

  const result = await authLogin(options, {
    service: `${SERVER}/portal_main/toPortalPage`,
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

  if (finalLocation?.startsWith(`${SERVER}/portal_main/toPortalPage`))
    return <ActionLoginSuccessResponse>{
      success: true,
      status: "success",
      cookies: authCookies,
    };

  return <AuthLoginFailedResponse>{
    success: false,
    status: "failed",
    type: "unknown",
    msg: "登录失败",
  };
};

export const actionLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    return res.json(await actionLogin(req.body));
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
