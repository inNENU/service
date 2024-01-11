import type { RequestHandler } from "express";

import { UNDER_STUDY_SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/login.js";
import { authLogin } from "../auth/login.js";
import { AUTH_SERVER } from "../auth/utils.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type { CookieType, EmptyObject, LoginOptions } from "../typings.js";
import { CookieStore, EDGE_USER_AGENT_HEADERS } from "../utils/index.js";

export interface UnderStudyLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type UnderStudyLoginResult =
  | UnderStudyLoginSuccessResult
  | AuthLoginFailedResult;

const SSO_LOGIN_URL = `${UNDER_STUDY_SERVER}/new/ssoLogin`;

export const underStudyLogin = async (
  options: LoginOptions,
  cookieStore = new CookieStore(),
): Promise<UnderStudyLoginResult> => {
  const result = await authLogin(options, {
    service: SSO_LOGIN_URL,
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

  if (finalLocation === SSO_LOGIN_URL) {
    const ssoResponse = await fetch(SSO_LOGIN_URL, {
      headers: {
        Cookie: cookieStore.getHeader(SSO_LOGIN_URL),
        Referer: UNDER_STUDY_SERVER,
        ...EDGE_USER_AGENT_HEADERS,
      },
      redirect: "manual",
    });

    if (
      ssoResponse.status === 302 &&
      ssoResponse.headers.get("Location") ===
        `${UNDER_STUDY_SERVER}/new/welcome.page`
    )
      return <UnderStudyLoginSuccessResult>{
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

export interface UnderStudyLoginSuccessResponse {
  success: true;
  /** @deprecated */
  cookies: CookieType[];
}

export type UnderStudyLoginResponse =
  | UnderStudyLoginSuccessResponse
  | AuthLoginFailedResult;

export const underStudyLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const result = await underStudyLogin(req.body);

    if (result.success) {
      const cookies = result.cookieStore
        .getAllCookies()
        .map((item) => item.toJSON());

      cookies.forEach(({ name, value, ...rest }) => {
        res.cookie(name, value, rest);
      });

      return res.json(<UnderStudyLoginSuccessResponse>{
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
