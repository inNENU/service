import type { RequestHandler } from "express";
import type { Cookie } from "set-cookie-parser";

import type { AuthLoginFailedResponse } from "../auth/login.js";
import { authLogin } from "../auth/login.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import {
  EDGE_USER_AGENT_HEADERS,
  getCookieHeader,
  getCookies,
} from "../utils/index.js";

const authenticityTokenRegExp =
  /<input\s+type="hidden"\s+name="authenticity_token" value="(.*?)" \/>/;

export interface VPNLoginSuccessResponse {
  success: true;
  /** @deprecated */
  status: "success";
  cookies: Cookie[];
}

export interface VPNLoginFailedResponse extends CommonFailedResponse {
  type: "locked" | "wrong" | "unknown";
}

export type VPNLoginResponse =
  | VPNLoginSuccessResponse
  | VPNLoginFailedResponse
  | AuthLoginFailedResponse;

export const VPN_SERVER = "https://webvpn.nenu.edu.cn";
const LOGIN_URL = `${VPN_SERVER}/users/sign_in`;
const CAS_LOGIN_URL = `${VPN_SERVER}/users/auth/cas`;

const COMMON_HEADERS = {
  DNT: "1",
  "Upgrade-Insecure-Requests": "1",
  "Sec-Fetch-Site": "same-origin",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-User": "?1",
  "Sec-Fetch-Dest": "document",
  ...EDGE_USER_AGENT_HEADERS,
};

export const vpnCASLogin = async ({
  id,
  password,
}: LoginOptions): Promise<VPNLoginResponse> => {
  const casResponse = await fetch(CAS_LOGIN_URL, {
    headers: COMMON_HEADERS,
    redirect: "manual",
  });

  const casCookies = getCookies(casResponse);

  if (casResponse.status === 302) {
    const authResult = await authLogin(
      { id, password },
      {
        service:
          "https://webvpn.nenu.edu.cn/users/auth/cas/callback?url=https%3A%2F%2Fwebvpn.nenu.edu.cn%2Fusers%2Fsign_in",
      },
    );

    if (!authResult.success) return authResult;

    const callbackResponse = await fetch(authResult.location, {
      headers: {
        Cookie: getCookieHeader([...casCookies, ...authResult.cookies]),
      },
      redirect: "manual",
    });

    if (callbackResponse.status === 500)
      return {
        success: false,
        status: "failed",
        type: "unknown",
        msg: "学校 WebVPN 服务崩溃，请稍后重试。",
      };

    const sessionCookie = getCookies(callbackResponse).find(
      ({ name }) => name === "_astraeus_session",
    )!;
    const location = callbackResponse.headers.get("Location");

    if (callbackResponse.status === 302) {
      if (location === LOGIN_URL)
        return {
          success: false,
          status: "failed",
          type: "locked",
          msg: "短时间内登录过多，小程序服务器已被屏蔽。请稍后重试",
        };

      if (location === `${VPN_SERVER}/vpn_key/update`) {
        const keyResponse = await fetch(`${VPN_SERVER}/vpn_key/update`, {
          headers: {
            Cookie: getCookieHeader([sessionCookie]),
          },
        });

        const cookies = getCookies(keyResponse);

        const webVpnCookies = [
          cookies.find(({ name }) => name === "_webvpn_key")!,
          cookies.find(({ name }) => name === "webvpn_username")!,
        ];

        return {
          success: true,
          status: "success",
          cookies: webVpnCookies,
        };
      }
    }
  }

  if (casResponse.status === 500)
    return {
      success: false,
      status: "failed",
      type: "unknown",
      msg: "学校 WebVPN 服务崩溃，请稍后重试。",
    };

  return {
    success: false,
    status: "failed",
    type: "unknown",
    msg: "未知错误",
  };
};

export const vpnLogin = async ({
  id,
  password,
}: LoginOptions): Promise<VPNLoginResponse> => {
  const loginPageResponse = await fetch(LOGIN_URL, {
    headers: COMMON_HEADERS,
  });

  const initialCookies = getCookies(loginPageResponse);

  console.log("Getting cookie:", initialCookies);

  const content = await loginPageResponse.text();

  const authenticityToken = authenticityTokenRegExp.exec(content)![1];

  const params = new URLSearchParams({
    utf8: "✓",
    authenticity_token: authenticityToken,
    "user[login]": id.toString(),
    "user[password]": password,
    "user[dymatice_code]": "unknown",
    "user[otp_with_capcha]": "false",
    commit: "登录 Login",
  });

  console.log("Requesting with params:", params);

  const loginResponse = await fetch(LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: getCookieHeader(initialCookies),
    },
    body: params.toString(),
    redirect: "manual",
  });

  const location = loginResponse.headers.get("Location");

  initialCookies.push(...getCookies(loginResponse));

  console.log("Request location:", location);
  console.log("Login cookies:", initialCookies);

  if (loginResponse.status === 302) {
    if (location === LOGIN_URL)
      return {
        success: false,
        status: "failed",
        type: "locked",
        msg: "短时间内登录过多，小程序服务器已被屏蔽。请稍后重试",
      };

    if (location === `${VPN_SERVER}/vpn_key/update`) {
      const keyResponse = await fetch(`${VPN_SERVER}/vpn_key/update`, {
        headers: {
          Cookie: getCookieHeader([
            ...initialCookies,
            ...getCookies(loginResponse),
          ]),
        },
      });

      const cookies = getCookies(keyResponse);

      const webVpnCookies = [
        cookies.find(({ name }) => name === "_webvpn_key")!,
        cookies.find(({ name }) => name === "webvpn_username")!,
      ];

      return {
        success: true,
        status: "success",
        cookies: webVpnCookies,
      };
    }
  }

  if (loginResponse.status === 200) {
    const response = await loginResponse.text();

    if (response.includes("用户名或密码错误, 超过五次将被锁定。"))
      return {
        success: false,
        status: "failed",
        type: "wrong",
        msg: "用户名或密码错误, 超过五次将被锁定。",
      };

    if (response.includes("您的帐号已被锁定, 请在十分钟后再尝试。"))
      return {
        success: false,
        status: "failed",
        type: "locked",
        msg: "您的帐号已被锁定, 请在十分钟后再尝试。",
      };
  }

  console.error("Unknown status", loginResponse.status);
  console.error("Response", await loginResponse.text());

  return {
    success: false,
    status: "failed",
    type: "unknown",
    msg: "未知错误",
  };
};

export const vpnCASLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const { id, password } = req.body;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const data = await vpnCASLogin({ id, password });

    return res.json(data);
  } catch (err) {
    return res.json(<VPNLoginFailedResponse>{
      success: false,
      status: "failed",
      msg: "参数错误",
    });
  }
};

export const vpnLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const { id, password } = req.body;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const data = await vpnLogin({ id, password });

    return res.json(data);
  } catch (err) {
    return res.json(<VPNLoginFailedResponse>{
      success: false,
      status: "failed",
      msg: "参数错误",
    });
  }
};
