import type { RequestHandler } from "express";
import type { Cookie } from "set-cookie-parser";

import type { LoginFailedData, LoginOptions } from "../auth/login.js";
import { WEB_VPN_AUTH_SERVER, login } from "../auth/login.js";
import type { EmptyObject } from "../typings.js";
import { getCookieHeader, getCookies } from "../utils/index.js";

export interface DSJXLoginSuccessResponse {
  status: "success";

  cookies: Cookie[];
  // userID: string;
}

export type DSJXLoginResponse = DSJXLoginSuccessResponse | LoginFailedData;

const COMMON_HEADERS = {
  "User-Agent":
    "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729; Tablet PC 2.0)",
};

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
    return <LoginFailedData>{
      status: "failed",
      type: "unknown",
      msg: "登录失败",
    };

  const finalLocation = ticketResponse.headers.get("Location");

  // Tip: The user id seems to be all same, so we don't need it anymore
  // if (finalLocation?.includes(";jsessionid=")) {
  //   const mainHeaders = {
  //     Cookie: getCookieHeader(authCookies),
  //     Referer: "https://dsjx.webvpn.nenu.edu.cn/Logon.do?method=logonjz",
  //     ...COMMON_HEADERS,
  //   };

  //   const mainPageResponse = await fetch(finalLocation, {
  //     headers: new Headers(mainHeaders),
  //   });

  //   console.log(mainPageResponse.status);

  //   const mainContent = await mainPageResponse.text();

  //   const userID = /getUserId\("(.*?)"\);/.exec(mainContent)![1];

  //   return <DSJXLoginSuccessResponse>{
  //     status: "success",
  //     cookies: authCookies,
  //     userID,
  //   };
  // }

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
