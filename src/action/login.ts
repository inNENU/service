import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import { ACTION_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { WEB_VPN_AUTH_SERVER, authLogin } from "../auth/index.js";
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
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { middleware } from "../utils/index.js";
import type { VPNLoginFailedResponse } from "../vpn/index.js";
import { vpnCASLogin } from "../vpn/index.js";

export interface ActionLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type ActionLoginResult =
  | ActionLoginSuccessResult
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

export const actionLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<ActionLoginResult> => {
  const vpnLoginResult = await vpnCASLogin(options, cookieStore);

  if (!vpnLoginResult.success) return vpnLoginResult;

  const result = await authLogin({
    ...options,
    service: `${ACTION_SERVER}/portal_main/toPortalPage`,
    webVPN: true,
    cookieStore,
  });

  if (!result.success) {
    console.error(result.msg);

    return result;
  }

  const ticketResponse = await fetch(result.location, {
    headers: {
      Cookie: cookieStore.getHeader(result.location),
      Referer: WEB_VPN_AUTH_SERVER,
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(ticketResponse, result.location);

  if (ticketResponse.status !== 302) return UnknownResponse("登录失败");

  const finalLocation = ticketResponse.headers.get("Location");

  if (finalLocation?.startsWith(`${ACTION_SERVER}/portal_main/toPortalPage`))
    return {
      success: true,
      cookieStore,
    } as ActionLoginResult;

  return UnknownResponse("登录失败");
};

export interface ActionLoginSuccessResponse {
  success: true;
  /** @deprecated */
  cookies: CookieType[];
}

export type ActionLoginFailedResponse =
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

export type ActionLoginResponse =
  | ActionLoginSuccessResponse
  | ActionLoginFailedResponse;

export const loginToAction = middleware<
  | ActionLoginFailedResponse
  | CommonFailedResponse<ActionFailType.MissingCredential>,
  LoginOptions,
  EmptyObject,
  { path: string }
>(async (req, res, next) => {
  if (["/check", "/login"].includes(req.params.path)) return next();

  const { id, password, authToken } = req.body;

  if (id && password && authToken) {
    const result = await actionLogin({ id, password, authToken });

    if (!result.success) return res.json(result);

    req.headers.cookie = result.cookieStore.getHeader(ACTION_SERVER);
  } else if (!req.headers.cookie) {
    return res.json(MissingCredentialResponse);
  }

  return next();
});

export const actionLoginHandler = middleware<ActionLoginResponse, AccountInfo>(
  async (req, res) => {
    try {
      const result =
        req.body.id === TEST_ID_NUMBER
          ? TEST_LOGIN_RESULT
          : await actionLogin(req.body);

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
    } catch (err) {
      const { message } = err as Error;

      console.error(err);

      return res.json(UnknownResponse(message));
    }
  },
);
