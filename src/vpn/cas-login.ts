import { CookieStore } from "@mptool/net";

import type { VPNLoginResponse, VPNLoginResult } from "./login.js";
import { LOGIN_URL, UPDATE_KEY_URL, VPN_DOMAIN, VPN_SERVER } from "./utils.js";
import { authLogin } from "../auth/login.js";
import { ActionFailType } from "../config/index.js";
import type { AccountInfo } from "../typings.js";
import { request } from "../utils/index.js";

const CAS_LOGIN_URL = `${VPN_SERVER}/users/auth/cas`;

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

    const location = callbackResponse.headers.get("Location");

    if (callbackResponse.status === 302) {
      if (location === LOGIN_URL)
        return {
          success: false,
          type: ActionFailType.AccountLocked,
          msg: "短时间内登录失败过多，账户已锁定。请 10 分钟后重试",
        };

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
  }

  if (casResponse.status === 500)
    return {
      success: false,
      type: ActionFailType.Error,
      msg: "学校 WebVPN 服务崩溃，请稍后重试。",
    };

  return {
    success: false,
    type: ActionFailType.Unknown,
    msg: "未知错误",
  };
};

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
