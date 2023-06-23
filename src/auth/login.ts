import CryptoJS from "crypto-js";
import type { RequestHandler } from "express";

import type { EmptyObject } from "../typings.js";
import { getCookies } from "../utils/index.js";

const saltRegExp = /var pwdDefaultEncryptSalt = "(.*)";/;

const DICT = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
const DICT_LENGTH = DICT.length;

const getRandomString = (length: number): string =>
  Array(length)
    .fill(null)
    .map(() => DICT.charAt(Math.floor(Math.random() * DICT_LENGTH)))
    .join("");

const customEncryptAES = (password: string, key: string): string => {
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

export interface LoginSuccessData {
  status: "success";
  cookies: string[];
  response: Response;
}

export interface LoginUnknownData {
  status: "unknown";
  cookies: string[];
  response: Response;
}

export interface LoginFailedData {
  status: "failed";
  msg: string;
  response: Response;
}

export type LoginData = LoginSuccessData | LoginUnknownData | LoginFailedData;

export const login = async (
  { id, password }: LoginOptions,
  service = ""
): Promise<LoginData> => {
  const loginPageResponse = await fetch(
    `https://authserver.nenu.edu.cn/authserver/login${
      service ? `?service=${encodeURIComponent(service)}` : ""
    }`
  );

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

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie: [
      ...cookies,
      "org.springframework.web.servlet.i18n.CookieLocaleResolver.LOCALE=zh_CN",
    ].join("; "),
    Origin: "https://authserver.nenu.edu.cn",
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

  const body = new URLSearchParams({
    username: id.toString(),
    password: customEncryptAES(password, salt),
    lt,
    dllt,
    execution,
    _eventId,
    rmShown,
    rememberMe: "on",
  });

  const response = await fetch(
    `https://authserver.nenu.edu.cn/authserver/login${
      service ? `?service=${encodeURIComponent(service)}` : ""
    }`,
    {
      method: "POST",
      headers: new Headers(headers),
      body,
      redirect: "manual",
    }
  );

  const location = response.headers.get("Location");

  cookies.push(...getCookies(response));

  console.log(`Request ends with ${response.status}`, location);
  console.log("Login cookies:", cookies);

  if (response.status === 302) {
    if (location === "https://authserver.nenu.edu.cn/authserver/login")
      return {
        status: "failed",
        msg: "用户名或密码错误",
        response,
      };

    if (location === "https://authserver.nenu.edu.cn/authserver/index.do")
      return {
        status: "success",
        cookies,
        response,
      };
  }

  return {
    status: "unknown",
    cookies,
    response,
  };
};

export interface LoginSuccessResponse {
  status: "success";
  cookies: string[];
}

export interface LoginFailedResponse {
  status: "failed";
  msg: string;
}

export type LoginResponse = LoginSuccessResponse | LoginFailedResponse;

export const loginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const { id, password } = req.body;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { response, ...data } = await login({ id, password });

    return res.json(<LoginResponse>data);
  } catch (err) {
    return res.json(<LoginFailedResponse>{ status: "failed", msg: "参数错误" });
  }
};
