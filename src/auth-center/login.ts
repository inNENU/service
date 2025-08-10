import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import { request } from "@/utils/index.js";

import { AUTH_INFO_PAGE } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { AUTH_SERVER, authLogin } from "../auth/index.js";
import {
  TEST_ID_NUMBER,
  TEST_LOGIN_RESULT,
  UnknownResponse,
} from "../config/index.js";
import type { AccountInfo } from "../typings.js";

export interface AuthCenterLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type AuthCenterLoginFailResult = AuthLoginFailedResponse;

export type AuthCenterLoginResult =
  | AuthCenterLoginSuccessResult
  | AuthCenterLoginFailResult;

export const authCenterLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<AuthCenterLoginResult> => {
  const result = await authLogin({
    ...options,
    service: AUTH_INFO_PAGE,
    cookieStore,
  });

  if (!result.success) {
    console.error(result.msg);

    return result;
  }

  const ticketUrl = result.location;

  const ticketResponse = await fetch(ticketUrl, {
    headers: {
      Cookie: cookieStore.getHeader(ticketUrl),
      Referer: AUTH_SERVER,
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(ticketResponse, ticketUrl);

  if (ticketResponse.status !== 302) return UnknownResponse("登录失败");

  const finalLocation = ticketResponse.headers.get("Location");

  if (finalLocation === AUTH_INFO_PAGE) {
    return {
      success: true,
      cookieStore,
    };
  }

  return UnknownResponse("登录失败");
};

export interface AuthCenterLoginSuccessResponse {
  success: true;
  cookies: CookieType[];
}

export type AuthCenterLoginResponse =
  | AuthCenterLoginSuccessResponse
  | AuthCenterLoginFailResult;

export const authCenterLoginHandler = request<
  AuthCenterLoginResponse,
  AccountInfo
>(async (req, res) => {
  const result =
    // fake result for testing
    req.body.id === TEST_ID_NUMBER
      ? TEST_LOGIN_RESULT
      : await authCenterLogin(req.body);

  if (result.success) {
    const cookies = result.cookieStore
      .getAllCookies()
      .map((item) => item.toJSON());

    cookies.forEach(({ name, value, ...rest }) => {
      res.cookie(name, value, rest);
    });

    return res.json({ success: true, cookies });
  }

  return res.json(result);
});
