import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import { authEncrypt } from "./encrypt.js";
import {
  AUTH_DOMAIN,
  AUTH_LOGIN_URL,
  AUTH_SERVER,
  SALT_REGEXP,
  WEB_VPN_AUTH_DOMAIN,
  WEB_VPN_AUTH_SERVER,
  isReAuthPage,
} from "./utils.js";
import {
  ActionFailType,
  UnknownResponse,
  WrongPasswordResponse,
  getRandomBlacklistHint,
} from "../config/index.js";
import type { AccountInfo, CommonFailedResponse } from "../typings.js";
import { isInBlackList, request } from "../utils/index.js";

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
  | ActionFailType.WrongCaptcha
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
  if (await isInBlackList(id))
    return {
      success: false,
      type: ActionFailType.BlackList,
      msg: getRandomBlacklistHint(),
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

  if (loginPageResponse.status === 302) {
    const location = loginPageResponse.headers.get("Location");

    if (isReAuthPage(server, location))
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
    ) {
      console.error("Forbidden service", service, "for id", id);

      return {
        success: false,
        type: ActionFailType.Forbidden,
        msg: "用户账号没有此服务权限。",
      };
    }

    const salt = SALT_REGEXP.exec(content)![1];
    const execution = /name="execution" value="(.*?)"/.exec(content)![1];

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
        Referer: url,
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

    if (response.status === 401) {
      if (
        resultContent.includes("该账号非常用账号或用户名密码有误") ||
        resultContent.includes("您提供的用户名或者密码有误")
      )
        return WrongPasswordResponse;

      if (resultContent.includes("图形动态码错误"))
        return {
          success: false,
          type: ActionFailType.WrongCaptcha,
          msg: "图形动态码错误，请重试",
        };

      if (resultContent.includes("该帐号已经被禁用"))
        return {
          success: false,
          type: ActionFailType.Forbidden,
          msg: "该帐号已经被禁用",
        };

      const lockedResult = /<span>账号已冻结，预计解冻时间：(.*?)<\/span>/.exec(
        resultContent,
      );

      if (lockedResult)
        return {
          success: false,
          type: ActionFailType.AccountLocked,
          msg: `账号已冻结，预计解冻时间：${lockedResult[1]}`,
        };

      console.error("Unknown login response: ", response.status, resultContent);

      return UnknownResponse("未知错误");
    }

    if (response.status === 200) {
      if (resultContent.includes("会话已失效，请刷新页面再登录"))
        return {
          success: false,
          type: ActionFailType.Expired,
          msg: "会话已过期，请重新登录",
        };

      if (resultContent.includes("当前账户已在其他PC端登录会话。"))
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

      if (
        resultContent.includes("不允许使用认证服务来认证您访问的目标应用。")
      ) {
        console.error("Forbidden service", service, "for id", id);

        return {
          success: false,
          type: ActionFailType.Forbidden,
          msg: "用户账号没有此服务权限。",
        };
      }

      console.error("Unknown login response: ", response.status, resultContent);

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

  console.error("Unknown login page status: ", loginPageResponse.status);

  return UnknownResponse("未知错误");
};

export interface AuthLoginSuccessResponse {
  success: true;
  cookies: CookieType[];
  location: string;
}

export type AuthLoginResponse =
  | AuthLoginSuccessResponse
  | AuthLoginFailedResponse;

export const authLoginHandler = request<AuthLoginResponse, AuthLoginOptions>(
  async (req, res) => {
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
      });
    }

    return res.json(result);
  },
);
