import { CookieStore } from "@mptool/net";
import type { RequestHandler } from "express";

import {
  TEST_COOKIE_STORE,
  TEST_ID,
  UnknownResponse,
} from "../../config/index.js";
import type { CommonFailedResponse, EmptyObject } from "../../typings.js";
import type { AuthCaptchaResponse } from "../captcha.js";
import { getAuthCaptcha } from "../captcha.js";
import {
  AUTH_CAPTCHA_URL,
  AUTH_DOMAIN,
  AUTH_LOGIN_URL,
  AUTH_SERVER,
  SALT_REGEXP,
} from "../utils.js";

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

export const TEST_AUTH_INIT_INFO: AuthInitInfoSuccessResult = {
  success: true,
  cookieStore: TEST_COOKIE_STORE,
  salt: "test",
  needCaptcha: false,
  captcha: null,
  params: {
    username: TEST_ID,
  },
};

export const getAuthInitInfo = async (
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

export const authInitInfoHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  EmptyObject,
  { id: string }
> = async (req, res) => {
  try {
    const id = req.query.id;

    const result =
      // Note: Return fake result for testing
      id === TEST_ID ? TEST_AUTH_INIT_INFO : await getAuthInitInfo(id);

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
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};