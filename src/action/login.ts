import type { RequestHandler } from "express";
import type { Cookie } from "set-cookie-parser";

import type { AuthLoginFailedResponse } from "../auth/login.js";
import { WEB_VPN_AUTH_SERVER, authLogin } from "../auth/login.js";
import type { EmptyObject, LoginOptions } from "../typings.js";
import { getCookieHeader, getCookies } from "../utils/index.js";
import type { VPNLoginFailedResponse } from "../vpn/login.js";
import { vpnCASLogin } from "../vpn/login.js";

export interface ActionLoginSuccessResponse {
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

  if (vpnLoginResult.status === "failed") return vpnLoginResult;

  const result = await authLogin(options, {
    service: "https://m-443.webvpn.nenu.edu.cn/portal_main/toPortalPage",
    webVPN: true,
    cookies: vpnLoginResult.cookies,
  });

  if (result.status !== "success") {
    console.error(result.msg);

    return <AuthLoginFailedResponse>{
      status: "failed",
      type: result.type,
      msg: result.msg,
    };
  }

  const authCookies = [
    ...vpnLoginResult.cookies,
    result.cookies.find((item) => item.name === "iPlanetDirectoryPro")!,
  ];

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
    ticketResponse.status,
    ticketResponse.headers.get("Location"),
    await ticketResponse.text(),
  );

  if (ticketResponse.status !== 302)
    return <AuthLoginFailedResponse>{
      status: "failed",
      type: "unknown",
      msg: "登录失败",
    };

  const finalLocation = ticketResponse.headers.get("Location");

  if (
    finalLocation?.startsWith(
      "https://m-443.webvpn.nenu.edu.cn/portal_main/toPortalPage",
    )
  )
    return <ActionLoginSuccessResponse>{
      status: "success",
      cookies: authCookies,
    };

  return { status: "failed", type: "unknown", msg: "登录失败" };
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
      status: "failed",
      msg: message,
    });
  }
};
