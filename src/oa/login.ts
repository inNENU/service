import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import { OA_ENTRANCE_PAGE, OA_MAIN_PAGE, OA_WEB_VPN_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/login.js";
import { authLogin } from "../auth/login.js";
import { WEB_VPN_AUTH_SERVER } from "../auth/utils.js";
import type { ActionFailType } from "../config/index.js";
import {
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
import { middleware } from "../utils/index.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";
import { vpnCASLogin } from "../vpn/index.js";

export interface OALoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type OALoginFailedResponse =
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

export type OALoginResult = OALoginSuccessResult | OALoginFailedResponse;

export const oaLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<OALoginResult> => {
  const vpnLoginResult = await vpnCASLogin(options, cookieStore);

  if (!vpnLoginResult.success) return vpnLoginResult;

  const result = await authLogin({
    ...options,
    service: OA_ENTRANCE_PAGE,
    webVPN: true,
    cookieStore,
  });

  if (!result.success) {
    console.error(result.msg);

    return result;
  }

  console.log(
    "location",
    result.location,
    cookieStore.getHeader(result.location),
  );
  console.log("server", cookieStore.getHeader(OA_WEB_VPN_SERVER));

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
    console.error(
      "Login to oa failed",
      ticketResponse.status,
      await ticketResponse.text(),
    );

    return UnknownResponse("登录失败");
  }

  const sessionLocation = ticketResponse.headers.get("Location");

  if (sessionLocation?.includes("jsessionid=")) {
    const sessionResponse = await fetch(sessionLocation, {
      headers: {
        Cookie: cookieStore.getHeader(sessionLocation),
        Referer: OA_WEB_VPN_SERVER,
      },
      redirect: "manual",
    });

    cookieStore.applyResponse(sessionResponse, sessionLocation);

    if (
      sessionResponse.status === 302 &&
      sessionResponse.headers.get("Location") === OA_MAIN_PAGE
    )
      return {
        success: true,
        cookieStore,
      };
  }

  console.error("login to oa failed", sessionLocation);

  return UnknownResponse("登录失败");
};

export interface OALoginSuccessResponse {
  success: true;
  /** @deprecated */
  cookies: CookieType[];
}

export type OALoginResponse = OALoginSuccessResponse | OALoginFailedResponse;

export const loginToOA = middleware<
  OALoginResponse | CommonFailedResponse<ActionFailType.MissingCredential>,
  LoginOptions
>(async (req, res, next) => {
  const { id, password, authToken } = req.body;

  if (id && password && authToken) {
    const result = await oaLogin({ id, password, authToken });

    if (!result.success) return res.json(result);

    req.headers.cookie = result.cookieStore.getHeader(OA_WEB_VPN_SERVER);
  } else if (!req.headers.cookie) {
    return res.json(MissingCredentialResponse);
  }

  return next();
});

export const oaLoginHandler = middleware<OALoginResponse, AccountInfo>(
  async (req, res) => {
    const result =
      // fake result for testing
      req.body.id === TEST_ID_NUMBER
        ? TEST_LOGIN_RESULT
        : await oaLogin(req.body);

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
