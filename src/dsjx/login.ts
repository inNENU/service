import type { RequestHandler } from "express";
import type { Cookie } from "set-cookie-parser";

import type { LoginFailedData, LoginOptions } from "../auth/login.js";
import { WEB_VPN_AUTH_SERVER, login } from "../auth/login.js";
import type { EmptyObject } from "../typings.js";
import { getCookieHeader, getCookies } from "../utils/index.js";

export interface DSJXLoginSuccessResponse {
  status: "success";

  cookies: Cookie[];
}

export type DSJXLoginResponse = DSJXLoginSuccessResponse | LoginFailedData;

export const dsjxLogin = async (
  options: LoginOptions
): Promise<DSJXLoginResponse> => {
  const result = await login(
    options,
    "http://dsjx.nenu.edu.cn:80/Logon.do?method=logonjz",
    true
  );

  if (result.status !== "success") {
    console.error(result.msg);

    return <LoginFailedData>{
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
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.51",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Upgrade-Insecure-Requests": "1",
    DNT: "1",
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
    await ticketResponse.text()
  );

  if (ticketResponse.status !== 302)
    return <LoginFailedData>{
      status: "failed",
      type: "unknown",
      msg: "登录失败",
    };

  const finalLocation = ticketResponse.headers.get("Location");

  if (finalLocation?.includes(";jsessionid="))
    return <DSJXLoginSuccessResponse>{
      status: "success",
      cookies: authCookies,
    };

  return { status: "failed", type: "unknown", msg: "登录失败" };
};

export const dsjxLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    return res.json(await dsjxLogin(req.body));
  } catch (err) {
    res.json(<LoginFailedData>{
      status: "failed",
      msg: (<Error>err).message,
    });
  }
};
