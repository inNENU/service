import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import { request } from "@/utils/index.js";

import { ACTION_MAIN_PAGE, ACTION_SERVER } from "./utils.js";
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
    service: ACTION_MAIN_PAGE,
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

  if (ticketResponse.status !== 302) {
    console.error(
      "action login failed with unknown ticketResponse",
      ticketResponse.status,
      ticketResponse,
      await ticketResponse.text(),
    );

    return UnknownResponse("由于当前账户暂时未获权限，融合门户登录失败");
  }

  const finalLocation = ticketResponse.headers.get("Location");

  if (finalLocation?.startsWith(ACTION_MAIN_PAGE)) {
    const finalLocationResponse = await fetch(finalLocation, {
      headers: {
        Cookie: cookieStore.getHeader(finalLocation),
        Referer: ACTION_SERVER,
      },
      redirect: "manual",
    });

    cookieStore.applyResponse(finalLocationResponse, finalLocation);

    if (finalLocationResponse.status !== 200) {
      console.error(
        "action login failed",
        finalLocationResponse.status,
        finalLocationResponse,
        await finalLocationResponse.text(),
      );

      return UnknownResponse("登录失败");
    }

    const content = await finalLocationResponse.text();

    const info = /pfs.comm.showDialog\("(.*?)",/.exec(content)?.[1];

    if (info) {
      console.error("action login forbidden:", info);

      return {
        success: false,
        type: ActionFailType.Forbidden,
        msg: info,
      };
    }

    return {
      success: true,
      cookieStore,
    };
  }

  console.error("action login failed", finalLocation);

  return UnknownResponse("登录失败");
};

export interface ActionLoginSuccessResponse {
  success: true;
  cookies: CookieType[];
}

export type ActionLoginFailedResponse =
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

export type ActionLoginResponse =
  | ActionLoginSuccessResponse
  | ActionLoginFailedResponse;

export const loginToAction = request<
  | ActionLoginFailedResponse
  | CommonFailedResponse<ActionFailType.MissingCredential>,
  LoginOptions
>(async (req, res, next) => {
  if (!req.body) return res.json(MissingCredentialResponse);

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

export const actionLoginHandler = request<ActionLoginResponse, AccountInfo>(
  async (req, res) => {
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
  },
);
