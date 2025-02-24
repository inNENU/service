import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import { MY_MAIN_PAGE, MY_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { WEB_VPN_AUTH_SERVER, authLogin } from "../auth/index.js";
import {
  ActionFailType,
  MissingCredentialResponse,
  TEST_ID_NUMBER,
  TEST_LOGIN_RESULT,
  UnknownResponse,
} from "../config/index.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  LoginOptions,
} from "../typings.js";
import { request } from "../utils/index.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";
import { FORBIDDEN_URL, vpnCASLogin } from "../vpn/index.js";

export interface MyLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type MyLoginFailedResponse =
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

export type MyLoginResult = MyLoginSuccessResult | MyLoginFailedResponse;

export const myLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<MyLoginResult> => {
  const vpnLoginResult = await vpnCASLogin(options, cookieStore);

  if (!vpnLoginResult.success) return vpnLoginResult;

  const result = await authLogin({
    ...options,
    service: MY_MAIN_PAGE,
    webVPN: true,
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
      Referer: WEB_VPN_AUTH_SERVER,
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(ticketResponse, ticketUrl);

  if (ticketResponse.status !== 302) {
    console.error("Login to my failed", ticketResponse.status);

    return UnknownResponse("登录失败");
  }

  const sessionLocation = ticketResponse.headers.get("Location");

  if (sessionLocation?.includes("jsessionid=")) {
    const mainResponse = await fetch(sessionLocation, {
      headers: {
        Cookie: cookieStore.getHeader(ticketUrl),
        Referer: MY_SERVER,
      },
      redirect: "manual",
    });

    cookieStore.applyResponse(mainResponse, sessionLocation);

    const content = await mainResponse.text();

    if (content.includes("<title>网上服务大厅</title>"))
      return {
        success: true,
        cookieStore,
      };
  }

  if (sessionLocation === FORBIDDEN_URL) {
    return {
      success: false,
      type: ActionFailType.Forbidden,
      msg: "当前系统暂未开放",
    };
  }

  console.error("login to my failed", sessionLocation);

  return UnknownResponse("登录失败");
};

export interface MyLoginSuccessResponse {
  success: true;
  cookies: CookieType[];
}

export type MyLoginResponse = MyLoginSuccessResponse | MyLoginFailedResponse;

export const loginToMy = request<
  MyLoginResponse | CommonFailedResponse<ActionFailType.MissingCredential>,
  LoginOptions
>(async (req, res, next) => {
  const { id, password, authToken } = req.body;

  if (id && password && authToken) {
    const result = await myLogin({ id, password, authToken });

    if (!result.success) return res.json(result);

    req.headers.cookie = result.cookieStore.getHeader(MY_SERVER);
  } else if (!req.headers.cookie) {
    return res.json(MissingCredentialResponse);
  }

  return next();
});

export const myLoginHandler = request<MyLoginResponse, AccountInfo>(
  async (req, res) => {
    const result =
      // fake result for testing
      req.body.id === TEST_ID_NUMBER
        ? TEST_LOGIN_RESULT
        : await myLogin(req.body);

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
  },
);
