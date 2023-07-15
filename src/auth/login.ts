import CryptoJS from "crypto-js";
import type { RequestHandler } from "express";

import { AUTH_SERVER, WEB_VPN_AUTH_SERVER } from "./utils.js";
import type {
  CommonFailedResponse,
  CookieType,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import {
  CookieStore,
  EDGE_USER_AGENT_HEADERS,
  getDomain,
} from "../utils/index.js";

export const saltRegExp = /var pwdDefaultEncryptSalt = "(.*)";/;

const DICT = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
const DICT_LENGTH = DICT.length;

const getRandomString = (length: number): string =>
  Array(length)
    .fill(null)
    .map(() => DICT.charAt(Math.floor(Math.random() * DICT_LENGTH)))
    .join("");

export const customEncryptAES = (password: string, key: string): string => {
  const CONTENT = getRandomString(64) + password;
  const SECRET_KEY = CryptoJS.enc.Utf8.parse(key);
  const SECRET_IV = CryptoJS.enc.Utf8.parse(getRandomString(16));

  return CryptoJS.AES.encrypt(CONTENT, SECRET_KEY, {
    iv: SECRET_IV,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  }).toString();
};

const COMMON_HEADERS = {
  DNT: "1",
  "Upgrade-Insecure-Requests": "1",
  ...EDGE_USER_AGENT_HEADERS,
};

export interface AuthLoginOptions {
  service?: string;
  webVPN?: boolean;
  cookieStore?: CookieStore;
}

export interface AuthLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
  location: string;
}

export interface AuthLoginFailedResult extends CommonFailedResponse {
  type: "captcha" | "wrong" | "unknown";
}

export type AuthLoginResult = AuthLoginSuccessResult | AuthLoginFailedResult;

export const authLogin = async (
  { id, password }: LoginOptions,
  {
    service = "",
    webVPN = false,
    cookieStore = new CookieStore(),
  }: AuthLoginOptions = {},
): Promise<AuthLoginResult> => {
  const server = webVPN ? WEB_VPN_AUTH_SERVER : AUTH_SERVER;

  const url = `${server}/authserver/login${
    service ? `?service=${encodeURIComponent(service)}` : ""
  }`;

  const loginPageResponse = await fetch(url, {
    headers: { ...COMMON_HEADERS, Cookie: cookieStore.getHeader(server) },
  });

  cookieStore.applyResponse(loginPageResponse, server);

  const content = await loginPageResponse.text();

  const salt = saltRegExp.exec(content)![1];
  const lt = content.match(/name="lt" value="(.*?)"/)![1];
  const dllt = content.match(/name="dllt" value="(.*?)"/)![1];
  const execution = content.match(/name="execution" value="(.*?)"/)![1];
  const _eventId = content.match(/name="_eventId" value="(.*?)"/)![1];
  const rmShown = content.match(/name="rmShown" value="(.*?)"/)![1];

  cookieStore.set({
    name: "org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE",
    value: "zh_CN",
    domain: getDomain(server),
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

  const needCaptcha = await (<Promise<boolean>>captchaCheckResponse.json());

  console.log("Need captcha:", needCaptcha);

  if (needCaptcha)
    return {
      success: false,
      type: "captcha",
      msg: "需要验证码",
    };

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie: cookieStore.getHeader(server),
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-User": "?1",
    "Sec-Fetch-Dest": "document",
    ...COMMON_HEADERS,
  };
  const params = {
    username: id.toString(),
    password: customEncryptAES(password, salt),
    lt,
    dllt,
    execution,
    _eventId,
    rmShown,
    rememberMe: "on",
  };

  const body = new URLSearchParams(params).toString();

  const response = await fetch(
    `${server}/authserver/login${
      service ? `?service=${encodeURIComponent(service)}` : ""
    }`,
    {
      method: "POST",
      headers: new Headers(headers),
      body,
      redirect: "manual",
    },
  );

  const resultContent = await response.text();
  const location = response.headers.get("Location");

  cookieStore.applyResponse(response, server);

  console.log(`Request location:`, location);
  console.log("Login cookies:", cookieStore.getCookiesMap(server));

  if (response.status === 200)
    if (resultContent.includes("您提供的用户名或者密码有误"))
      return {
        success: false,
        type: "wrong",
        msg: "用户名或密码错误",
      };
  if (resultContent.includes("请输入验证码"))
    return {
      success: false,
      type: "captcha",
      msg: "需要验证码，请访问官网统一身份认证网页进行登录。成功登录后即可消除验证码。",
    };

  if (response.status === 302) {
    if (location === `${server}/authserver/login`)
      return {
        success: false,
        type: "wrong",
        msg: "用户名或密码错误",
      };

    return {
      success: true,
      cookieStore,
      location: location!,
    };
  }

  console.error("Response", await response.text());

  return {
    success: false,
    type: "unknown",
    msg: "未知错误",
  };
};

export interface AuthLoginSuccessResponse {
  success: true;
  cookies: CookieType[];
  location: string;
}

export type AuthLoginResponse =
  | AuthLoginSuccessResponse
  | AuthLoginFailedResult;

export const authLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const { id, password } = req.body;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const result = await authLogin({ id, password });

    if (result.success)
      return res.json(<AuthLoginSuccessResponse>{
        success: true,
        cookies: result.cookieStore
          .getAllCookies()
          .map((item) => item.toJSON()),
        location: result.location,
      });

    return res.json(result);
  } catch (err) {
    return res.json(<AuthLoginFailedResult>{
      success: false,
      msg: "参数错误",
    });
  }
};
