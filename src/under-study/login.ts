import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";
import type { RequestHandler } from "express";

import { UNDER_STUDY_SERVER, UNDER_STUDY_VPN_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/login.js";
import { authLogin } from "../auth/login.js";
import { AUTH_SERVER, WEB_VPN_AUTH_SERVER } from "../auth/utils.js";
import type { ActionFailType } from "../config/index.js";
import {
  RestrictedResponse,
  TEST_ID_NUMBER,
  TEST_LOGIN_RESULT,
  UnknownResponse,
} from "../config/index.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  EmptyObject,
} from "../typings.js";
import { EDGE_USER_AGENT_HEADERS } from "../utils/index.js";

export interface UnderStudyLoginOptions extends AccountInfo {
  webVPN?: boolean;
}

export interface UnderStudyLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type UnderStudyLoginResult =
  | UnderStudyLoginSuccessResult
  | AuthLoginFailedResponse
  | CommonFailedResponse<ActionFailType.Restricted>;

// FIXME: Add webVPN issue hints
export const underStudyLogin = async (
  { webVPN = false, ...options }: UnderStudyLoginOptions,
  cookieStore = new CookieStore(),
): Promise<UnderStudyLoginResult> => {
  const server = webVPN ? UNDER_STUDY_VPN_SERVER : UNDER_STUDY_SERVER;
  const SSO_LOGIN_URL = `${server}/new/ssoLogin`;
  const MAIN_URL = `${server}/new/welcome.page`;

  const result = await authLogin({
    ...options,
    webVPN,
    service: SSO_LOGIN_URL,
    cookieStore,
  });

  if (!result.success) {
    console.error(result.msg);

    return result;
  }

  console.log("Login location", result.location);

  const ticketResponse = await fetch(
    webVPN
      ? result.location.replace(UNDER_STUDY_SERVER, UNDER_STUDY_VPN_SERVER)
      : result.location,
    {
      headers: {
        Cookie: cookieStore.getHeader(result.location),
        Referer: webVPN ? WEB_VPN_AUTH_SERVER : AUTH_SERVER,
      },
      redirect: "manual",
    },
  );

  cookieStore.applyResponse(ticketResponse, result.location);

  if (ticketResponse.status === 405) {
    return RestrictedResponse;
  }

  if (ticketResponse.status !== 302) {
    console.log("ticket response", await ticketResponse.text());

    return UnknownResponse("登录失败");
  }

  const finalLocation = ticketResponse.headers.get("Location");

  console.log("location: ", finalLocation);

  if (finalLocation === SSO_LOGIN_URL) {
    const ssoResponse = await fetch(SSO_LOGIN_URL, {
      headers: {
        Cookie: cookieStore.getHeader(SSO_LOGIN_URL),
        Referer: server,
        ...EDGE_USER_AGENT_HEADERS,
      },
      redirect: "manual",
    });

    if (
      ssoResponse.status === 302 &&
      ssoResponse.headers.get("Location")?.startsWith(MAIN_URL)
    )
      return {
        success: true,
        cookieStore,
      } as UnderStudyLoginSuccessResult;
  }

  return UnknownResponse("登录失败");
};

export interface UnderStudyLoginSuccessResponse {
  success: true;
  /** @deprecated */
  cookies: CookieType[];
}

export type UnderStudyLoginResponse =
  | UnderStudyLoginSuccessResponse
  | AuthLoginFailedResponse;

export const underStudyLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  UnderStudyLoginOptions
> = async (req, res) => {
  try {
    const result =
      // fake result for testing
      req.body.id === TEST_ID_NUMBER
        ? TEST_LOGIN_RESULT
        : await underStudyLogin(req.body);

    if (result.success) {
      const cookies = result.cookieStore
        .getAllCookies()
        .map((item) => item.toJSON());

      cookies.forEach(({ name, value, ...rest }) => {
        res.cookie(name, value, rest);
      });

      return res.json({
        success: true,
        cookies,
      } as UnderStudyLoginSuccessResponse);
    }

    return res.json(result);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
