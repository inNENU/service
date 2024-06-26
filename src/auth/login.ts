import type { CookieType } from "@mptool/net";
import type { RequestHandler } from "express";

import { authEncrypt } from "./auth-encrypt.js";
import {
  AUTH_DOMAIN,
  AUTH_SERVER,
  SALT_REGEXP,
  WEB_VPN_AUTH_SERVER,
} from "./utils.js";
import { ActionFailType, UnknownResponse } from "../config/index.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  EmptyObject,
} from "../typings.js";
import { BLACKLIST_HINT, CookieStore, isInBlackList } from "../utils/index.js";

const COMMON_HEADERS = {
  DNT: "1",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": "inNENU",
};

export interface AuthLoginOptions extends AccountInfo {
  service?: string;
  webVPN?: boolean;
}

export interface AuthLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
  location: string;
}

export type AuthLoginFailedResponse = CommonFailedResponse<
  | ActionFailType.AccountLocked
  | ActionFailType.BlackList
  | ActionFailType.EnabledSSO
  | ActionFailType.Forbidden
  | ActionFailType.NeedCaptcha
  | ActionFailType.WrongPassword
  | ActionFailType.Unknown
>;

export type AuthLoginResult = AuthLoginSuccessResult | AuthLoginFailedResponse;

export const authLogin = async ({
  id,
  password,
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

  const server = webVPN ? WEB_VPN_AUTH_SERVER : AUTH_SERVER;

  const url = `${server}/authserver/login${
    service ? `?service=${encodeURIComponent(service)}` : ""
  }`;

  const loginPageResponse = await fetch(url, {
    headers: { ...COMMON_HEADERS, Cookie: cookieStore.getHeader(server) },
  });

  cookieStore.applyResponse(loginPageResponse, server);

  const location = loginPageResponse.headers.get("Location");

  if (loginPageResponse.status === 302)
    return {
      success: true,
      cookieStore,
      location: location!,
    };

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
    const lt = content.match(/name="lt" value="(.*?)"/)![1];
    const dllt = content.match(/name="dllt" value="(.*?)"/)![1];
    const execution = content.match(/name="execution" value="(.*?)"/)![1];
    const _eventId = content.match(/name="_eventId" value="(.*?)"/)![1];
    const rmShown = content.match(/name="rmShown" value="(.*?)"/)![1];

    cookieStore.set({
      name: "org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE",
      value: "zh_CN",
      domain: AUTH_DOMAIN,
    });

    const captchaCheckResponse = await fetch(
      `${server}/authserver/needCaptcha.html?username=${id}&pwdEncrypt2=pwdEncryptSalt&_=${Date.now()}`,
      {
        headers: {
          Cookie: cookieStore.getHeader(server),
          ...COMMON_HEADERS,
          Referer: `${server}/authserver/login`,
        },
      },
    );

    cookieStore.applyResponse(captchaCheckResponse, server);

    const needCaptcha = await (captchaCheckResponse.json() as Promise<boolean>);

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
        Cookie: cookieStore.getHeader(server),
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-User": "?1",
        "Sec-Fetch-Dest": "document",
        ...COMMON_HEADERS,
      },
      body: new URLSearchParams({
        username: id.toString(),
        password: authEncrypt(password, salt),
        lt,
        dllt,
        execution,
        _eventId,
        rmShown,
        rememberMe: "on",
      }),
      redirect: "manual",
    });

    const resultContent = await response.text();
    const location = response.headers.get("Location");

    cookieStore.applyResponse(response, server);

    console.log(`Request location:`, location);
    console.log("Login cookies:", cookieStore.getCookiesMap(server));

    if (response.status === 200) {
      if (resultContent.includes("您提供的用户名或者密码有误"))
        return {
          success: false,
          type: ActionFailType.WrongPassword,
          msg: "用户名或密码错误",
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

      if (resultContent.includes("请输入验证码"))
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

      return {
        success: false,
        type: ActionFailType.Unknown,
        msg: "未知错误",
      };
    }

    if (response.status === 302) {
      if (location === `${server}/authserver/login`)
        return {
          success: false,
          type: ActionFailType.WrongPassword,
          msg: "用户名或密码错误",
        };

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
