import { CookieStore } from "@mptool/net";
import type { RequestHandler } from "express";

import type { AuthCaptchaResponse } from "./captcha.js";
import { getAuthCaptcha } from "./captcha.js";
import { authEncrypt } from "./encrypt.js";
import {
  AUTH_CAPTCHA_URL,
  AUTH_DOMAIN,
  AUTH_LOGIN_URL,
  AUTH_SERVER,
  IMPROVE_INFO_URL,
  RE_AUTH_URL,
  SALT_REGEXP,
  UPDATE_INFO_URL,
} from "./utils.js";
import { authCenterLogin, getAvatar } from "../auth-center/index.js";
import { INFO_PREFIX } from "../auth-center/utils.js";
import {
  ActionFailType,
  TEST_COOKIE_STORE,
  TEST_ID,
  TEST_INFO,
  UnknownResponse,
  WrongPasswordResponse,
} from "../config/index.js";
import type { MyInfo } from "../my/index.js";
import { getMyInfo, myLogin } from "../my/index.js";
import { MY_SERVER } from "../my/utils.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  EmptyObject,
} from "../typings.js";
import { BLACKLIST_HINT, isInBlackList } from "../utils/index.js";
import { vpnLogin } from "../vpn/login.js";

export type AuthInitInfoSuccessResult = {
  success: true;
  cookieStore: CookieStore;
  /** 盐值 */
  salt: string;
  /** 请求参数 */
  params: Record<string, string>;
} & (
  | { needCaptcha: true; captcha: AuthCaptchaResponse }
  | { needCaptcha: false; captcha: null }
);

export type AuthInitInfoResult =
  | AuthInitInfoSuccessResult
  | CommonFailedResponse;

const TEST_AUTH_INFO: AuthInitInfoSuccessResult = {
  success: true,
  cookieStore: TEST_COOKIE_STORE,
  salt: "test",
  needCaptcha: false,
  captcha: null,
  params: {
    username: TEST_ID,
  },
};

export const authInitInfo = async (
  id: string,
  cookieStore = new CookieStore(),
): Promise<AuthInitInfoResult> => {
  const loginPageResponse = await fetch(AUTH_LOGIN_URL, {
    headers: {
      Cookie: cookieStore.getHeader(AUTH_SERVER),
      "User-Agent": "inNENU service",
    },
  });

  cookieStore.applyResponse(loginPageResponse, AUTH_SERVER);

  const content = await loginPageResponse.text();

  const salt = SALT_REGEXP.exec(content)![1];
  const execution = /name="execution" value="(.*?)"/.exec(content)![1];

  cookieStore.set({
    name: "org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE",
    value: "zh_CN",
    domain: AUTH_DOMAIN,
  });

  const checkCaptchaLink = `${AUTH_SERVER}/authserver/checkNeedCaptcha.htl?username=${id}&_=${Date.now()}`;

  const captchaCheckResponse = await fetch(checkCaptchaLink, {
    headers: {
      Cookie: cookieStore.getHeader(checkCaptchaLink),
      Referer: AUTH_LOGIN_URL,
      "User-Agent": "inNENU service",
    },
  });

  cookieStore.applyResponse(captchaCheckResponse, AUTH_SERVER);

  const { isNeed: needCaptcha } =
    await (captchaCheckResponse.json() as Promise<{
      isNeed: boolean;
    }>);

  const captchaResponse = needCaptcha
    ? await getAuthCaptcha(cookieStore.getHeader(AUTH_CAPTCHA_URL), id)
    : null;

  return {
    success: true,
    needCaptcha,
    captcha: captchaResponse,
    cookieStore,
    salt,
    params: {
      username: id.toString(),
      lt: "",
      cllt: "usernameLogin",
      dllt: "generalLogin",
      execution,
      _eventId: "submit",
      rememberMe: "true",
    },
  } as AuthInitInfoSuccessResult;
};

export interface InitAuthOptions extends AccountInfo {
  /** 选项 */
  params: Record<string, string>;
  /** 盐值 */
  salt: string;
  /** 用户 OpenID */
  openid: string;
}

export interface InitAuthSuccessResult {
  success: true;
  info: (MyInfo & { avatar: string }) | null;
  cookieStore: CookieStore;
}

export type InitAuthFailedResponse =
  | CommonFailedResponse<
      | ActionFailType.AccountLocked
      | ActionFailType.BlackList
      | ActionFailType.EnabledSSO
      | ActionFailType.Expired
      | ActionFailType.NeedCaptcha
      | ActionFailType.Unknown
      | ActionFailType.WeekPassword
      | ActionFailType.WrongCaptcha
      | ActionFailType.WrongPassword
    >
  | (CommonFailedResponse<ActionFailType.NeedReAuth> & {
      cookieStore: CookieStore;
    });

export type InitAuthResult = InitAuthSuccessResult | InitAuthFailedResponse;

const TEST_AUTH_INIT: InitAuthSuccessResult = {
  success: true,
  info: TEST_INFO,
  cookieStore: TEST_COOKIE_STORE,
};

export const initAuth = async (
  { id, password, authToken, salt, params, openid }: InitAuthOptions,
  cookieHeader: string,
): Promise<InitAuthResult> => {
  const cookieStore = new CookieStore();
  const loginResponse = await fetch(AUTH_LOGIN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader,
      "User-Agent": "inNENU service",
    },
    body: new URLSearchParams({
      ...params,
      password: authEncrypt(password, salt),
    }),
    redirect: "manual",
  });

  cookieStore.applyResponse(loginResponse, AUTH_LOGIN_URL);

  const location = loginResponse.headers.get("Location");
  const resultContent = await loginResponse.text();

  if (loginResponse.status === 401) {
    if (resultContent.includes("您提供的用户名或者密码有误"))
      return WrongPasswordResponse;

    const lockedResult = /<span>账号已冻结，预计解冻时间：(.*?)<\/span>/.exec(
      resultContent,
    );

    if (lockedResult)
      return {
        success: false,
        type: ActionFailType.AccountLocked,
        msg: `账号已冻结，预计解冻时间：${lockedResult[1]}`,
      };

    console.error(
      "Unknown login response: ",
      loginResponse.status,
      resultContent,
    );

    return UnknownResponse("未知错误");
  }

  if (loginResponse.status === 200) {
    if (resultContent.includes("无效的验证码"))
      return {
        success: false,
        type: ActionFailType.WrongCaptcha,
        msg: "验证码错误",
      };

    if (resultContent.includes("您提供的用户名或者密码有误"))
      return WrongPasswordResponse;

    if (resultContent.includes("会话已失效，请刷新页面再登录"))
      return {
        success: false,
        type: ActionFailType.Expired,
        msg: "会话已过期，请重新登陆",
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
        msg: "需要验证码",
      };
  }

  if (loginResponse.status === 302) {
    if (location?.startsWith(AUTH_LOGIN_URL)) return WrongPasswordResponse;

    if (location?.startsWith(IMPROVE_INFO_URL)) {
      const response = await fetch(UPDATE_INFO_URL, {
        method: "POST",
        headers: {
          Accept: "application/json, text/javascript, */*; q=0.01",
          Cookie: cookieHeader + ";" + cookieStore.getHeader(UPDATE_INFO_URL),
          "User-Agent": "inNENU",
        },
      });

      const result = (await response.json()) as { errMsg: string };

      return {
        success: false,
        type: ActionFailType.WeekPassword,
        msg: result.errMsg ?? "密码太弱，请手动修改密码",
      };
    }

    if (location?.startsWith(RE_AUTH_URL))
      return {
        success: false,
        type: ActionFailType.NeedReAuth,
        msg: "需要二次认证",
        cookieStore,
      };

    let info: (MyInfo & { avatar: string }) | null = null;

    let loginResult = await myLogin({ id, password, authToken }, cookieStore);

    if (
      "type" in loginResult &&
      loginResult.type === ActionFailType.Forbidden
    ) {
      // Activate VPN by login
      const vpnLoginResult = await vpnLogin(
        { id, password, authToken },
        cookieStore,
      );

      if (vpnLoginResult.success)
        loginResult = await myLogin({ id, password, authToken }, cookieStore);
      else console.error("VPN login failed", vpnLoginResult);
    }

    // 获得信息
    if (loginResult.success) {
      const studentInfo = await getMyInfo(cookieStore.getHeader(MY_SERVER));

      if (studentInfo.success) {
        let avatar = "";

        const authCenterResult = await authCenterLogin(
          { id, password, authToken },
          cookieStore,
        );

        if (authCenterResult.success) {
          const avatarInfo = await getAvatar(
            cookieStore.getHeader(INFO_PREFIX),
          );

          if (avatarInfo.success) avatar = avatarInfo.data.avatar;
        }

        info = {
          avatar,
          ...studentInfo.data,
        };
      }

      console.log(`${id} 登录信息:\n`, JSON.stringify(info, null, 2));
    }

    if (isInBlackList(id, openid, info))
      return {
        success: false,
        type: ActionFailType.BlackList,
        msg: BLACKLIST_HINT[Math.floor(Math.random() * BLACKLIST_HINT.length)],
      };

    return {
      success: true,
      info,
      cookieStore,
    };
  }

  console.error(
    "Unknown login response: ",
    loginResponse.status,
    resultContent,
  );

  return UnknownResponse("登录失败");
};

export type AuthInitInfoResponse = AuthInitInfoSuccessResult | InitAuthResult;

export const authInitHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  InitAuthOptions,
  { id: string }
> = async (req, res) => {
  try {
    if (req.method === "GET") {
      const id = req.query.id;

      const result =
        // Note: Return fake result for testing
        id === TEST_ID ? TEST_AUTH_INFO : await authInitInfo(id);

      if (result.success) {
        const cookies = result.cookieStore
          .getAllCookies()
          .map((item) => item.toJSON());

        cookies.forEach(({ name, value, ...rest }) => {
          res.cookie(name, value, rest);
        });

        return res.json({
          success: true,
          needCaptcha: result.needCaptcha,
          captcha: result.captcha,
          params: result.params,
          salt: result.salt,
        } as AuthInitInfoSuccessResult);
      }

      return res.json(result);
    }

    const cookieHeader = req.headers.cookie ?? "";

    // Note: Return fake result for testing
    if (cookieHeader.includes("TEST")) return res.json(TEST_AUTH_INIT);

    const result = await initAuth(req.body, cookieHeader);

    if ("cookieStore" in result) {
      const cookies = result.cookieStore
        .getAllCookies()
        .map((item) => item.toJSON());

      cookies.forEach(({ name, value, ...rest }) => {
        res.cookie(name, value, rest);
      });

      // @ts-expect-error: cookieStore is not a JSON-serializable object
      delete result.cookieStore;
    }

    return res.json(result);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
