import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import { EDGE_USER_AGENT_HEADERS, request } from "@/utils/index.js";

import type { AuthLoginFailedResponse } from "../auth/index.js";
import { authLogin } from "../auth/index.js";
import type { ActionFailType } from "../config/index.js";
import {
  MissingCredentialResponse,
  TEST_ID_NUMBER,
  TEST_LOGIN_RESULT,
  unknownResponse,
} from "../config/index.js";
import type { AccountInfo, CommonFailedResponse, LoginOptions } from "../typings.js";
import { GRAD_STUDY_SERVER } from "./utils.js";

const SSO_LOGIN_URL = `${GRAD_STUDY_SERVER}/new/ssoLogin`;
const MAIN_URL = `${GRAD_STUDY_SERVER}/new/welcome.page`;

export interface GradStudyLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type GradStudyLoginFailedResponse = AuthLoginFailedResponse;

export type GradStudyLoginResult = GradStudyLoginSuccessResult | GradStudyLoginFailedResponse;

export const gradStudyLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<GradStudyLoginResult> => {
  const result = await authLogin({
    ...options,
    service: SSO_LOGIN_URL,
    cookieStore,
  });

  if (!result.success) {
    console.error(result.msg);

    return result;
  }

  const ticketResponse = await fetch(result.location, {
    headers: {
      Cookie: cookieStore.getHeader(result.location),
      ...EDGE_USER_AGENT_HEADERS,
    },
    redirect: "manual",
    signal: AbortSignal.timeout(10000),
  });

  cookieStore.applyResponse(ticketResponse, result.location);

  if (ticketResponse.status !== 302) return unknownResponse("登录失败");

  const finalLocation = ticketResponse.headers.get("Location");

  if (finalLocation === SSO_LOGIN_URL) {
    const ssoResponse = await fetch(SSO_LOGIN_URL, {
      headers: {
        Cookie: cookieStore.getHeader(SSO_LOGIN_URL),
        Referer: GRAD_STUDY_SERVER,
        ...EDGE_USER_AGENT_HEADERS,
      },
      redirect: "manual",
      signal: AbortSignal.timeout(10000),
    });

    if (ssoResponse.status === 302 && ssoResponse.headers.get("Location")?.startsWith(MAIN_URL)) {
      return {
        success: true,
        cookieStore,
      };
    }
  }

  return unknownResponse("登录失败");
};

export interface GradStudyLoginSuccessResponse {
  success: true;
  cookies: CookieType[];
}

export type GradStudyLoginResponse = GradStudyLoginSuccessResponse | GradStudyLoginFailedResponse;

export const loginToGradStudy = request<
  GradStudyLoginResponse | CommonFailedResponse<ActionFailType.MissingCredential>,
  LoginOptions
  // oxlint-disable-next-line typescript/consistent-return
>(async (req, res, next) => {
  if (!req.body) return res.json(MissingCredentialResponse);

  const { id, password, authToken } = req.body;

  if (id && password && authToken) {
    const result = await gradStudyLogin({ id, password, authToken });

    if (!result.success) return res.json(result);

    req.headers.cookie = result.cookieStore.getHeader(GRAD_STUDY_SERVER);
  } else if (!req.headers.cookie) {
    return res.json(MissingCredentialResponse);
  }

  next();
});

export const gradStudyLoginHandler = request<GradStudyLoginResponse, AccountInfo>(
  async (req, res) => {
    const result =
      // fake result for testing
      req.body.id === TEST_ID_NUMBER ? TEST_LOGIN_RESULT : await gradStudyLogin(req.body);

    if (result.success) {
      const cookies = result.cookieStore.getAllCookies().map((item) => item.toJSON());

      cookies.forEach(({ name, value, ...rest }) => {
        res.cookie(name, value, rest);
      });

      return res.json({ success: true, cookies });
    }

    return res.json(result);
  },
);
