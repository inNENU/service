import type { RequestHandler } from "express";

import { SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/login.js";
import { authLogin } from "../auth/login.js";
import { AUTH_SERVER } from "../auth/utils.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type { CookieType, EmptyObject, LoginOptions } from "../typings.js";
import { CookieStore, EDGE_USER_AGENT_HEADERS } from "../utils/index.js";

export interface UnderNewSystemLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type UnderNewSystemLoginResult =
  | UnderNewSystemLoginSuccessResult
  | AuthLoginFailedResult;

const ssoUrl = `${SERVER}/new/ssoLogin`;

export const underNewSystemLogin = async (
  options: LoginOptions,
  cookieStore = new CookieStore(),
): Promise<UnderNewSystemLoginResult> => {
  const result = await authLogin(options, {
    service: ssoUrl,
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

  console.log("Login location", result.location);

  const ticketResponse = await fetch(result.location, {
    headers: {
      Cookie: cookieStore.getHeader(result.location),
      Referer: AUTH_SERVER,
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(ticketResponse, result.location);

  if (ticketResponse.status !== 302) {
    console.log("ticket response", await ticketResponse.text());

    return {
      success: false,
      type: LoginFailType.Unknown,
      msg: "登录失败",
    };
  }

  const finalLocation = ticketResponse.headers.get("Location");

  console.log("location: ", finalLocation);

  if (finalLocation === ssoUrl) {
    const ssoResponse = await fetch(ssoUrl, {
      headers: {
        Cookie: cookieStore.getHeader(ssoUrl),
        Referer: `${SERVER}/framework/main.jsp`,
        ...EDGE_USER_AGENT_HEADERS,
      },
      redirect: "manual",
    });

    if (
      ssoResponse.status === 302 &&
      ssoResponse.headers.get("Location") === `${SERVER}/new/welcome.page`
    )
      return <UnderNewSystemLoginSuccessResult>{
        success: true,
        cookieStore,
      };
  }

  return {
    success: false,
    type: LoginFailType.Unknown,
    msg: "登录失败",
  };
};

export interface UnderSystemLoginSuccessResponse {
  success: true;
  /** @deprecated */
  cookies: CookieType[];
}

export type UnderSystemLoginResponse =
  | UnderSystemLoginSuccessResponse
  | AuthLoginFailedResult;

export const underNewSystemLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const result = await underNewSystemLogin(req.body);

    if (result.success) {
      const cookies = result.cookieStore
        .getAllCookies()
        .map((item) => item.toJSON());

      cookies.forEach(({ name, value, ...rest }) => {
        res.cookie(name, value, rest);
      });

      return res.json(<UnderSystemLoginSuccessResponse>{
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
