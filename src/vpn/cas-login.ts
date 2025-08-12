import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import { request } from "@/utils/index.js";

import { UPDATE_KEY_URL, VPN_DOMAIN, VPN_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { AUTH_SERVER, authLogin, isReAuthPage } from "../auth/index.js";
import { ActionFailType, UnknownResponse } from "../config/index.js";
import type { AccountInfo, CommonFailedResponse } from "../typings.js";

const CAS_LOGIN_URL = `${VPN_SERVER}/users/auth/cas`;

export interface VPNLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type VPNLoginFailedResponse = CommonFailedResponse<
  | ActionFailType.AccountLocked
  | ActionFailType.WrongPassword
  | ActionFailType.Error
  | ActionFailType.Unknown
>;

export type VPNLoginResult =
  | VPNLoginSuccessResult
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

export const vpnCASLogin = async (
  { id, password, authToken }: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<VPNLoginResult> => {
  const casResponse = await fetch(CAS_LOGIN_URL, {
    redirect: "manual",
  });

  cookieStore.applyResponse(casResponse, VPN_DOMAIN);

  if (casResponse.status === 302) {
    const authResult = await authLogin({
      id,
      password,
      authToken,
      service: `${VPN_SERVER}/users/auth/cas/callback?url=${encodeURIComponent(
        `${VPN_SERVER}/users/sign_in`,
      )}`,
      cookieStore,
    });

    if (!authResult.success) return authResult;

    if (isReAuthPage(AUTH_SERVER, authResult.location)) {
      return {
        success: false,
        type: ActionFailType.NeedReAuth,
        msg: "需要二次认证，请重新登录",
      };
    }

    const callbackResponse = await fetch(authResult.location, {
      headers: {
        Cookie: cookieStore.getHeader(authResult.location),
      },
      redirect: "manual",
    });

    if (callbackResponse.status === 500)
      return {
        success: false,
        type: ActionFailType.Error,
        msg: "学校 WebVPN 服务崩溃，请稍后重试。",
      };

    cookieStore.applyResponse(callbackResponse, authResult.location);

    if (callbackResponse.status === 302) {
      const location = callbackResponse.headers.get("Location");

      if (location === UPDATE_KEY_URL) {
        const keyResponse = await fetch(UPDATE_KEY_URL, {
          headers: {
            Cookie: cookieStore.getHeader(UPDATE_KEY_URL),
          },
        });

        cookieStore.applyResponse(keyResponse, VPN_DOMAIN);

        return {
          success: true,
          cookieStore,
        };
      }
    }

    console.error(
      "VPN 服务更新未知错误",
      callbackResponse,
      await callbackResponse.text(),
    );

    return UnknownResponse("VPN 服务负载过高，请稍后重试");
  }

  if (casResponse.status === 500)
    return {
      success: false,
      type: ActionFailType.Error,
      msg: "学校 WebVPN 服务崩溃，请稍后重试。",
    };

  console.error("VPN 服务未知错误", casResponse, await casResponse.text());

  return UnknownResponse("未知错误");
};

export interface VPNLoginSuccessResponse {
  success: true;
  cookies: CookieType[];
}

export type VPNLoginResponse =
  | VPNLoginSuccessResponse
  | AuthLoginFailedResponse
  | VPNLoginFailedResponse;

export const vpnCASLoginHandler = request<VPNLoginResponse, AccountInfo>(
  async (req, res) => {
    const { id, password, authToken } = req.body;

    const result = await vpnCASLogin({ id, password, authToken });

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
