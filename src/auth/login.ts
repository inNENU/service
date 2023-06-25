import CryptoJS from "crypto-js";
import type { RequestHandler } from "express";
import type { Cookie } from "set-cookie-parser";

import type { CommonFailedResponse, EmptyObject } from "../typings.js";
import {
  EDGE_USER_AGENT_HEADERS,
  getCookieHeader,
  getCookies,
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

export interface LoginOptions {
  /** 学号 */
  id: number;
  /** 密码 */
  password: string;
}

export interface LoginSuccessResponse {
  status: "success";
  cookies: Cookie[];
  location: string;
}

export interface LoginFailedResponse extends CommonFailedResponse {
  type: "captcha" | "wrong" | "unknown";
}

export type LoginResponse = LoginSuccessResponse | LoginFailedResponse;

export const AUTH_SERVER = "https://authserver.nenu.edu.cn";
export const WEB_VPN_AUTH_SERVER = "https://authserver-443.webvpn.nenu.edu.cn";

const COMMON_HEADERS = {
  DNT: "1",
  "Upgrade-Insecure-Requests": "1",
  ...EDGE_USER_AGENT_HEADERS,
};

export const login = async (
  { id, password }: LoginOptions,
  service = "",
  webVPN = false
): Promise<LoginResponse> => {
  const server = webVPN ? WEB_VPN_AUTH_SERVER : AUTH_SERVER;

  const url = `${server}/authserver/login${
    service ? `?service=${encodeURIComponent(service)}` : ""
  }`;

  console.log("Login url:", url);

  const loginPageResponse = await fetch(url, {
    headers: COMMON_HEADERS,
  });

  const cookies = getCookies(loginPageResponse);

  console.log("Getting cookie:", cookies);

  const content = await loginPageResponse.text();

  const salt = saltRegExp.exec(content)![1];
  const lt = content.match(/name="lt" value="(.*?)"/)![1];
  const dllt = content.match(/name="dllt" value="(.*?)"/)![1];
  const execution = content.match(/name="execution" value="(.*?)"/)![1];
  const _eventId = content.match(/name="_eventId" value="(.*?)"/)![1];
  const rmShown = content.match(/name="rmShown" value="(.*?)"/)![1];

  console.log("Parsing", { salt, lt, dllt, execution, _eventId, rmShown });

  const captchaCheckResponse = await fetch(
    `${server}/authserver/needCaptcha.html?username=${id}&pwdEncrypt2=pwdEncryptSalt&_=${Date.now()}`,
    {
      headers: {
        Cookie: getCookieHeader([
          ...cookies,
          {
            name: "org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE",
            value: "zh_CN",
          },
        ]),
        ...COMMON_HEADERS,
        Referer: `${server}/authserver/login`,
      },
    }
  );

  const needCaptcha = await (<Promise<boolean>>captchaCheckResponse.json());

  console.log("Need captcha:", needCaptcha);

  if (needCaptcha)
    return {
      status: "failed",
      type: "captcha",
      msg: "需要验证码",
    };

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie: [
      getCookieHeader([
        ...cookies,
        {
          name: "org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE",
          value: "zh_CN",
        },
      ]),
    ].join("; "),
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

  console.log("Headers", headers);
  console.log("Params", params);

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
    }
  );

  const resultContent = await response.text();
  const location = response.headers.get("Location");

  cookies.push(...getCookies(response));

  console.log(`Request ends with ${response.status}`, location);
  console.log("Login cookies:", cookies);

  if (response.status === 200)
    if (resultContent.includes("您提供的用户名或者密码有误"))
      return {
        status: "failed",
        type: "wrong",
        msg: "用户名或密码错误",
      };
    else if (resultContent.includes("请输入验证码"))
      return {
        status: "failed",
        type: "captcha",
        msg: "需要验证码",
      };

  if (response.status === 302) {
    if (location === `${server}/authserver/login`)
      return {
        status: "failed",
        type: "wrong",
        msg: "用户名或密码错误",
      };

    return {
      status: "success",
      cookies,
      location: location!,
    };
  }

  console.error("Unknown status", response.status);
  console.error("Reponse", await response.text());

  return {
    status: "failed",
    type: "unknown",
    msg: "未知错误",
  };
};

export const loginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const { id, password } = req.body;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const data = await login({ id, password });

    return res.json(data);
  } catch (err) {
    return res.json(<LoginFailedResponse>{ status: "failed", msg: "参数错误" });
  }
};
