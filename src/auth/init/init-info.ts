import { CookieStore } from "@mptool/net";

import { TEST_COOKIE_STORE, TEST_ID } from "@/config/index.js";
import type { CommonFailedResponse, EmptyObject } from "@/typings.js";
import { request } from "@/utils/index.js";

import type { GetAuthCaptchaResponse } from "../captcha.js";
import { getAuthCaptcha } from "../captcha.js";
import {
  AUTH_CAPTCHA_URL,
  AUTH_DOMAIN,
  AUTH_LOGIN_URL,
  AUTH_SERVER,
  SALT_REGEXP,
} from "../utils.js";

export type AuthInitInfoSuccessResponse = {
  success: true;
  cookieStore: CookieStore;
  /** 盐值 */
  salt: string;
  /** 请求参数 */
  params: Record<string, string>;
} & (
  | { needCaptcha: true; captcha: GetAuthCaptchaResponse }
  | { needCaptcha: false; captcha: null }
);

export type AuthInitInfoResponse =
  | AuthInitInfoSuccessResponse
  | CommonFailedResponse;

export const TEST_AUTH_INIT_INFO: AuthInitInfoSuccessResponse = {
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
): Promise<AuthInitInfoResponse> => {
  // FIXME:
  // return UnknownResponse(
  //   "教育部网络安全演练期间，小程序账号功能暂不可用。预计持续两周",
  // );

  const loginPageResponse = await fetch(AUTH_LOGIN_URL, {
    headers: {
      Cookie: cookieStore.getHeader(AUTH_SERVER),
      "User-Agent": "inNENU service",
    },
    signal: AbortSignal.timeout(5000),
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
    signal: AbortSignal.timeout(5000),
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
  } as AuthInitInfoSuccessResponse;
};

export const authInitInfoHandler = request<
  AuthInitInfoResponse,
  EmptyObject,
  { id: string }
>(async (req, res) => {
  const id = req.query.id;

  const result =
    // Note: Return fake result for testing
    id === TEST_ID ? TEST_AUTH_INIT_INFO : await getAuthInitInfo(id);

  if (!result.success) return res.json(result);

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
  } as AuthInitInfoSuccessResponse);
});
