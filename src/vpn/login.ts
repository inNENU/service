import type { RequestHandler } from "express";

import { VPN_DOMAIN, VPN_SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/login.js";
import { authLogin } from "../auth/login.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type {
  CommonFailedResponse,
  CookieType,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import { CookieStore } from "../utils/index.js";

const authenticityTokenRegExp =
  /<input\s+type="hidden"\s+name="authenticity_token" value="(.*?)" \/>/;

const LOGIN_URL = `${VPN_SERVER}/users/sign_in`;
const CAS_LOGIN_URL = `${VPN_SERVER}/users/auth/cas`;
const UPDATE_KEY_URL = `${VPN_SERVER}/vpn_key/update`;

export interface VPNLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export interface VPNLoginFailedResult extends CommonFailedResponse {
  type:
    | LoginFailType.AccountLocked
    | LoginFailType.WrongPassword
    | LoginFailType.Unknown;
}

export type VPNLoginResult =
  | VPNLoginSuccessResult
  | VPNLoginFailedResult
  | AuthLoginFailedResult;

export const vpnCASLogin = async (
  { id, password }: LoginOptions,
  cookieStore = new CookieStore()
): Promise<VPNLoginResult> => {
  const casResponse = await fetch(CAS_LOGIN_URL, {
    redirect: "manual",
  });

  cookieStore.applyResponse(casResponse, VPN_DOMAIN);

  if (casResponse.status === 302) {
    const authResult = await authLogin(
      { id, password },
      {
        cookieStore,
        service: `${VPN_SERVER}/users/auth/cas/callback?url=https%3A%2F%2Fwebvpn.nenu.edu.cn%2Fusers%2Fsign_in`,
      }
    );

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
        type: LoginFailType.Unknown,
        msg: "学校 WebVPN 服务崩溃，请稍后重试。",
      };

    cookieStore.applyResponse(callbackResponse, authResult.location);

    const location = callbackResponse.headers.get("Location");

    if (callbackResponse.status === 302) {
      if (location === LOGIN_URL)
        return {
          success: false,
          type: LoginFailType.AccountLocked,
          msg: "短时间内失败登录过多，请 10 分钟后重试",
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
      type: LoginFailType.Unknown,
      msg: "学校 WebVPN 服务崩溃，请稍后重试。",
    };

  return {
    success: false,
    type: LoginFailType.Unknown,
    msg: "未知错误",
  };
};

export const vpnLogin = async (
  { id, password }: LoginOptions,
  cookieStore = new CookieStore()
): Promise<VPNLoginResult> => {
  const loginPageResponse = await fetch(LOGIN_URL);

  cookieStore.applyResponse(loginPageResponse, VPN_SERVER);

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
      Cookie: cookieStore.getHeader(LOGIN_URL),
    },
    body: params.toString(),
    redirect: "manual",
  });

  const location = loginResponse.headers.get("Location");

  cookieStore.applyResponse(loginResponse, VPN_SERVER);

  console.log("Request location:", location);

  if (loginResponse.status === 302) {
    if (location === LOGIN_URL)
      return {
        success: false,
        type: LoginFailType.AccountLocked,
        msg: "短时间内登录过多，小程序服务器已被屏蔽。请稍后重试",
      };

    if (location === UPDATE_KEY_URL) {
      const keyResponse = await fetch(UPDATE_KEY_URL, {
        headers: {
          Cookie: cookieStore.getHeader(UPDATE_KEY_URL),
        },
      });

      cookieStore.applyResponse(keyResponse, VPN_SERVER);

      return {
        success: true,
        cookieStore,
      };
    }
  }

  if (loginResponse.status === 200) {
    const response = await loginResponse.text();

    if (response.includes("用户名或密码错误, 超过五次将被锁定。"))
      return {
        success: false,
        type: LoginFailType.WrongPassword,
        msg: "用户名或密码错误, 超过五次将被锁定。",
      };

    if (response.includes("您的帐号已被锁定, 请在十分钟后再尝试。"))
      return {
        success: false,
        type: LoginFailType.AccountLocked,
        msg: "您的帐号已被锁定, 请在十分钟后再尝试。",
      };
  }

  console.error("Unknown VPN login response:", await loginResponse.text());

  return {
    success: false,
    type: LoginFailType.Unknown,
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

    const data = await vpnCASLogin({ id, password });

    if (data.success)
      return res.json(<VPNLoginSuccessResponse>{
        success: true,
        cookies: data.cookieStore.getAllCookies().map((item) => item.toJSON()),
      });

    return res.json(data);
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);

    return res.json(<VPNLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};

export interface VPNLoginSuccessResponse {
  success: true;
  /** @deprecated */
  cookies: CookieType[];
}

export type VPNLoginResponse =
  | VPNLoginSuccessResponse
  | AuthLoginFailedResult
  | VPNLoginFailedResult;

export const vpnLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const { id, password } = req.body;

    const result = await vpnLogin({ id, password });

    if (result.success) {
      const cookies = result.cookieStore
        .getAllCookies()
        .map((item) => item.toJSON());

      cookies.forEach(({ name, value, ...rest }) => {
        res.cookie(name, value, rest);
      });

      return res.json(<VPNLoginSuccessResponse>{
        success: true,
        cookies,
      });
    }

    return res.json(result);
  } catch (err) {
    console.error(err);

    return res.json(<VPNLoginFailedResult>{
      success: false,
      msg: "参数错误",
    });
  }
};
