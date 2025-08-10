import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import { EDGE_USER_AGENT_HEADERS, request } from "@/utils/index.js";

import { UNDER_STUDY_SERVER, UNDER_STUDY_VPN_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { AUTH_SERVER, WEB_VPN_AUTH_SERVER, authLogin } from "../auth/index.js";
import type { ActionFailType } from "../config/index.js";
import {
  MissingCredentialResponse,
  RestrictedResponse,
  TEST_ID_NUMBER,
  TEST_LOGIN_RESULT,
  UnknownResponse,
} from "../config/index.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  LoginOptions,
} from "../typings.js";

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
      signal: AbortSignal.timeout(10000),
    },
  );

  cookieStore.applyResponse(ticketResponse, result.location);

  if (ticketResponse.status === 405) {
    return RestrictedResponse;
  }

  if (ticketResponse.status !== 302) {
    return UnknownResponse("登录失败");
  }

  const finalLocation = ticketResponse.headers.get("Location");

  if (finalLocation === SSO_LOGIN_URL) {
    const ssoResponse = await fetch(SSO_LOGIN_URL, {
      headers: {
        Cookie: cookieStore.getHeader(SSO_LOGIN_URL),
        Referer: server,
        ...EDGE_USER_AGENT_HEADERS,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });

    if (
      ssoResponse.status === 302 &&
      ssoResponse.headers.get("Location")?.startsWith(MAIN_URL)
    )
      return {
        success: true,
        cookieStore,
      };
  }

  return UnknownResponse("登录失败");
};

export interface UnderStudyLoginSuccessResponse {
  success: true;
  cookies: CookieType[];
}

export type UnderStudyLoginResponse =
  | UnderStudyLoginSuccessResponse
  | AuthLoginFailedResponse
  | CommonFailedResponse<ActionFailType.Restricted>;

export const loginToUnderStudy = request<
  | UnderStudyLoginResponse
  | CommonFailedResponse<ActionFailType.MissingCredential>,
  LoginOptions
>(async (req, res, next) => {
  if (!req.body) {
    return res.json(MissingCredentialResponse);
  }

  const { id, password, authToken } = req.body;

  if (id && password && authToken) {
    const result = await underStudyLogin({ id, password, authToken });

    if (!result.success) return res.json(result);

    req.headers.cookie = result.cookieStore.getHeader(UNDER_STUDY_SERVER);
  } else if (!req.headers.cookie) {
    return res.json(MissingCredentialResponse);
  }

  return next();
});

export const underStudyLoginHandler = request<
  UnderStudyLoginResponse,
  UnderStudyLoginOptions
>(async (req, res) => {
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
    });
  }

  return res.json(result);
});
