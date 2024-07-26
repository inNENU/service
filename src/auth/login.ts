import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";
import type { RequestHandler } from "express";

import { authEncrypt } from "./auth-encrypt.js";
import {
  AUTH_DOMAIN,
  AUTH_LOGIN_URL,
  AUTH_SERVER,
  SALT_REGEXP,
  WEB_VPN_AUTH_DOMAIN,
  WEB_VPN_AUTH_SERVER,
} from "./utils.js";
import {
  ActionFailType,
  UnknownResponse,
  WrongPasswordResponse,
} from "../config/index.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  EmptyObject,
} from "../typings.js";
import { BLACKLIST_HINT, isInBlackList } from "../utils/index.js";

export interface AuthLoginOptions extends AccountInfo {
  service?: string;
  webVPN?: boolean;
}

export interface AuthLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
  /** 重定向位置 */
  location: string;
}

export type AuthLoginFailedResponse = CommonFailedResponse<
  | ActionFailType.AccountLocked
  | ActionFailType.BlackList
  | ActionFailType.EnabledSSO
  | ActionFailType.Forbidden
  | ActionFailType.Expired
  | ActionFailType.NeedCaptcha
  | ActionFailType.NeedReAuth
  | ActionFailType.WrongPassword
  | ActionFailType.Unknown
>;

export type AuthLoginResult = AuthLoginSuccessResult | AuthLoginFailedResponse;

export const authLogin = async ({
  id,
  password,
  authToken,
  service = "",
  webVPN = false,
  cookieStore = new CookieStore(),
}: AuthLoginOptions & {
  cookieStore?: CookieStore;
}): Promise<AuthLoginResult> => {
  if (isInBlackList(id))
    return {
      success: false,
      type: ActionFailType.BlackList,
      msg: BLACKLIST_HINT[Math.floor(Math.random() * BLACKLIST_HINT.length)],
    };

  const domain = webVPN ? WEB_VPN_AUTH_DOMAIN : AUTH_DOMAIN;
  const server = webVPN ? WEB_VPN_AUTH_SERVER : AUTH_SERVER;

  // set auth token manually to bypass the re-auth login
  cookieStore.set({
    name: "MULTIFACTOR_USERS",
    value: authToken,
    domain: domain,
    httpOnly: true,
    expires: new Date("2092-08-12T17:46:12.361Z"),
  });

  const url = `${server}/authserver/login${
    service ? `?service=${encodeURIComponent(service)}` : ""
  }`;

  const loginPageResponse = await fetch(url, {
    headers: {
      Cookie: cookieStore.getHeader(server),
      "User-Agent": "inNENU service",
    },
  });

  cookieStore.applyResponse(loginPageResponse, server);

  const location = loginPageResponse.headers.get("Location");

  if (loginPageResponse.status === 302) {
    if (
      location?.startsWith(`${server}/authserver/reAuthCheck/reAuthSubmit.do`)
    )
      return {
        success: false,
        type: ActionFailType.NeedReAuth,
        msg: "需要二次认证，请重新登录",
      };

    return {
      success: true,
      cookieStore,
      location: location!,
    };
  }

  if (loginPageResponse.status === 200) {
    const content = await loginPageResponse.text();

    if (
      content.includes("不允许使用认证服务来认证您访问的目标应用。") ||
      content.includes("不允许访问")
    )
      return {
        success: false,
        type: ActionFailType.Forbidden,
        msg: "用户账号没有此服务权限。",
      };

    const salt = SALT_REGEXP.exec(content)![1];
    const execution = content.match(/name="execution" value="(.*?)"/)![1];

    cookieStore.set({
      name: "org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE",
      value: "zh_CN",
      domain,
    });

    const checkCaptchaLink = `${server}/authserver/checkNeedCaptcha.htl?username=${id}&_=${Date.now()}`;

    const captchaCheckResponse = await fetch(checkCaptchaLink, {
      headers: {
        Cookie: cookieStore.getHeader(checkCaptchaLink),
        Referer: AUTH_LOGIN_URL,
        "User-Agent": "inNENU service",
      },
    });

    cookieStore.applyResponse(captchaCheckResponse, server);

    const { isNeed: needCaptcha } =
      await (captchaCheckResponse.json() as Promise<{
        isNeed: boolean;
      }>);

    if (needCaptcha)
      return {
        success: false,
        type: ActionFailType.NeedCaptcha,
        msg: "需要验证码，请重新登录",
      };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieStore.getHeader(url),
        "User-Agent": "inNENU service",
      },
      body: new URLSearchParams({
        username: id.toString(),
        password: authEncrypt(password, salt),
        lt: "",
        cllt: "usernameLogin",
        dllt: "generalLogin",
        execution,
        _eventId: "submit",
        rememberMe: "true",
      }),
      redirect: "manual",
    });

    const resultContent = await response.text();
    const location = response.headers.get("Location");

    cookieStore.applyResponse(response, server);

    console.log(`Request location:`, location);
    console.log("Login cookies:", cookieStore.getCookiesMap(server));

    if (response.status === 401) return WrongPasswordResponse;

    if (response.status === 200) {
      if (resultContent.includes("您提供的用户名或者密码有误"))
        return WrongPasswordResponse;

      if (resultContent.includes("会话已失效，请刷新页面再登录"))
        return {
          success: false,
          type: ActionFailType.Expired,
          msg: "会话已过期，请重新登陆",
        };

      if (
        resultContent.includes("该帐号已经被锁定，请点击&ldquo;账号激活&rdquo;")
      )
        return {
          success: false,
          type: ActionFailType.AccountLocked,
          msg: "该帐号已经被锁定，请使用小程序的“账号激活”功能",
        };

      if (
        resultContent.includes(
          "当前存在其他用户使用同一帐号登录，是否注销其他使用同一帐号的用户。",
        )
      )
        return {
          success: false,
          type: ActionFailType.EnabledSSO,
          msg: "您已开启单点登录，请访问学校统一身份认证官网，在个人设置中关闭单点登录后重试。",
        };

      if (resultContent.includes("<span>请输入验证码</span>"))
        return {
          success: false,
          type: ActionFailType.NeedCaptcha,
          msg: "需要验证码，请重新登录。",
        };

      if (resultContent.includes("不允许使用认证服务来认证您访问的目标应用。"))
        return {
          success: false,
          type: ActionFailType.Forbidden,
          msg: "用户账号没有此服务权限。",
        };

      console.error("Unknown login response: ", resultContent);

      return UnknownResponse("未知错误");
    }

    if (response.status === 302) {
      if (location?.startsWith(`${server}/authserver/login`))
        return WrongPasswordResponse;

      return {
        success: true,
        cookieStore,
        location: location!,
      };
    }
  }

  console.error("Unknown login response: ", loginPageResponse.status);

  return UnknownResponse("未知错误");
};

export interface AuthLoginSuccessResponse {
  success: true;
  /**
   * @deprecated
   *
   * For future web app only
   */
  cookies: CookieType[];
  location: string;
}

export type AuthLoginResponse =
  | AuthLoginSuccessResponse
  | AuthLoginFailedResponse;

export const authLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  AuthLoginOptions
> = async (req, res) => {
  try {
    const result = await authLogin(req.body);

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
        location: result.location,
      } as AuthLoginSuccessResponse);
    }

    return res.json(result);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
