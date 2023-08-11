import type { RequestHandler } from "express";

import { authEncrypt, saltRegExp } from "./authEncrypt.js";
import { getBasicInfo } from "./info.js";
import { AUTH_SERVER } from "./utils.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type { PostStudentInfo } from "../post-system/info.js";
import { getPostInfo } from "../post-system/info.js";
import { postSystemLogin } from "../post-system/login.js";
import { MAIN_URL } from "../post-system/utils.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import {
  STUDENT_ARCHIVE_QUERY_URL,
  getUnderInfo,
  underSystemLogin,
} from "../under-system/index.js";
import type { UnderStudentInfo } from "../under-system/info.js";
import { CookieStore, getDomain } from "../utils/index.js";
import { vpnLogin } from "../vpn/login.js";

const COMMON_HEADERS = {
  DNT: "1",
  "Upgrade-Insecure-Requests": "1",
  "User-Agent": "inNENU",
};

export interface AuthInitResult {
  success: true;
  needCaptcha: boolean;
  cookieStore: CookieStore;
  captcha: string;
  params: Record<string, string>;
  salt: string;
}

const getCaptcha = async (cookieStore: CookieStore): Promise<string> => {
  const captchaResponse = await fetch(
    `${AUTH_SERVER}/authserver/captcha.html?ts=${Date.now()}`,
    {
      headers: {
        Cookie: cookieStore.getHeader(AUTH_SERVER),
        ...COMMON_HEADERS,
        Referer: `${AUTH_SERVER}/authserver/login`,
      },
    },
  );

  const captcha = await captchaResponse.arrayBuffer();

  cookieStore.applyResponse(captchaResponse, AUTH_SERVER);

  return `data:image/png;base64,${Buffer.from(captcha).toString("base64")}`;
};

export const authInit = async (
  id: string,
  cookieStore = new CookieStore(),
): Promise<AuthInitResult> => {
  const url = `${AUTH_SERVER}/authserver/login`;

  const loginPageResponse = await fetch(url, {
    headers: { ...COMMON_HEADERS, Cookie: cookieStore.getHeader(AUTH_SERVER) },
  });

  cookieStore.applyResponse(loginPageResponse, AUTH_SERVER);

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
    domain: getDomain(AUTH_SERVER),
  });

  const captchaCheckResponse = await fetch(
    `${AUTH_SERVER}/authserver/needCaptcha.html?username=${id}&pwdEncrypt2=pwdEncryptSalt&_=${Date.now()}`,
    {
      headers: {
        Cookie: cookieStore.getHeader(AUTH_SERVER),
        ...COMMON_HEADERS,
        Referer: `${AUTH_SERVER}/authserver/login`,
      },
    },
  );

  cookieStore.applyResponse(captchaCheckResponse, AUTH_SERVER);

  const needCaptcha = await (<Promise<boolean>>captchaCheckResponse.json());

  console.log("Need captcha:", needCaptcha);

  const params = {
    username: id.toString(),
    lt,
    dllt,
    execution,
    _eventId,
    rmShown,
    rememberMe: "on",
  };

  const captcha = needCaptcha ? await getCaptcha(cookieStore) : null;

  return <AuthInitResult>{
    success: true,
    needCaptcha,
    captcha,
    cookieStore,
    salt,
    params,
  };
};

export interface AuthLoginOptions extends LoginOptions {
  params: Record<string, string>;
  salt: string;
  captcha: string;
}

export interface AuthLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export interface AuthLoginFailedResponse extends CommonFailedResponse {
  type: LoginFailType;
}

export type AuthLoginResult = AuthLoginSuccessResult | AuthLoginFailedResponse;

export const authLogin = async (
  { password, salt, captcha, params }: AuthLoginOptions,
  cookieHeader: string,
): Promise<AuthLoginResult> => {
  const cookieStore = new CookieStore();
  const url = `${AUTH_SERVER}/authserver/login`;

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie: cookieHeader,
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-User": "?1",
    "Sec-Fetch-Dest": "document",
    ...COMMON_HEADERS,
  };

  const body = new URLSearchParams({
    ...params,
    password: authEncrypt(password, salt),
    captchaResponse: captcha,
  }).toString();

  const response = await fetch(url, {
    method: "POST",
    headers: new Headers(headers),
    body,
    redirect: "manual",
  });

  const resultContent = await response.text();
  const location = response.headers.get("Location");

  cookieStore.applyResponse(response, url);

  console.log(`Request location:`, location);

  if (response.status === 200) {
    if (resultContent.includes("无效的验证码"))
      return {
        success: false,
        type: LoginFailType.WrongCaptcha,
        msg: "验证码错误",
      };

    if (resultContent.includes("您提供的用户名或者密码有误"))
      return {
        success: false,
        type: LoginFailType.WrongPassword,
        msg: "用户名或密码错误",
      };

    if (
      resultContent.includes("该帐号已经被锁定，请点击&ldquo;账号激活&rdquo;")
    )
      return {
        success: false,
        type: LoginFailType.AccountLocked,
        msg: "该帐号已经被锁定，请使用小程序的“账号激活”功能",
      };

    if (
      resultContent.includes(
        "当前存在其他用户使用同一帐号登录，是否注销其他使用同一帐号的用户。",
      )
    )
      return {
        success: false,
        type: LoginFailType.EnabledSSO,
        msg: "您已开启单点登录，请访问学校统一身份认证官网，在个人设置中关闭单点登录后重试。",
      };

    if (resultContent.includes("请输入验证码"))
      return {
        success: false,
        type: LoginFailType.NeedCaptcha,
        msg: "需要验证码",
      };
  }

  if (response.status === 302) {
    if (location === `${AUTH_SERVER}/authserver/login`)
      return {
        success: false,
        type: LoginFailType.WrongPassword,
        msg: "用户名或密码错误",
      };

    return {
      success: true,
      cookieStore,
    };
  }

  console.error("Unknown login response: ", resultContent);

  return {
    success: false,
    type: LoginFailType.Unknown,
    msg: "未知错误",
  };
};

export interface AuthInitInfoResponse {
  success: true;
  needCaptcha: boolean;
  captcha: string;
  params: Record<string, string>;
  salt: string;
}

export interface AuthInfo
  extends Partial<UnderStudentInfo>,
    Partial<PostStudentInfo> {
  /** 用户姓名 */
  name: string;

  /** 登陆别名 */
  alias: string;
}

export interface AuthInitResponse {
  success: true;

  info: AuthInfo | null;
}

export const authInitHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  AuthLoginOptions,
  { id: string }
> = async (req, res) => {
  try {
    if (req.method === "GET") {
      const result = await authInit(req.query.id);

      if (result.success) {
        const cookies = result.cookieStore
          .getAllCookies()
          .map((item) => item.toJSON());

        cookies.forEach(({ name, value, ...rest }) => {
          res.cookie(name, value, rest);
        });

        return res.json(<AuthInitInfoResponse>{
          success: true,
          needCaptcha: result.needCaptcha,
          captcha: result.captcha,
          params: result.params,
          salt: result.salt,
        });
      }

      return res.json(result);
    }

    const result = await authLogin(req.body, req.headers.cookie!);

    if (result.success) {
      const { cookieStore } = result;

      const cookies = cookieStore.getAllCookies().map((item) => item.toJSON());

      cookies.forEach(({ name, value, ...rest }) => {
        res.cookie(name, value, rest);
      });

      const { id } = req.body;
      const grade = Number(id.toString().substring(0, 4));
      let info: Partial<AuthInfo> = {
        // FIXME: Compact code
        name: "未知",
        id,
        grade,
        school: "未知",
        major: "未知",
      };

      const basicInfo = await getBasicInfo(
        cookieStore.getHeader(`${AUTH_SERVER}/authserver/`),
      );

      if (basicInfo.success) {
        info.name = basicInfo.name;
        info.alias = basicInfo.alias;
      }

      // 本科生
      if (req.body.id.toString().charAt(4) === "0") {
        let loginResult = await underSystemLogin({
          id: req.body.id,
          password: req.body.password,
        });

        if (
          "type" in loginResult &&
          loginResult.type === LoginFailType.Forbidden
        ) {
          // Activate VPN by login
          const vpnLoginResult = await vpnLogin(req.body);

          if (vpnLoginResult.success)
            loginResult = await underSystemLogin({
              id: req.body.id,
              password: req.body.password,
            });
          else console.error("VPN login failed", vpnLoginResult);
        }

        // 获得信息
        if (loginResult.success) {
          const studentInfo = await getUnderInfo(
            loginResult.cookieStore.getHeader(STUDENT_ARCHIVE_QUERY_URL),
          );

          if (studentInfo.success) info = { ...info, ...studentInfo.info };
        }
      } else {
        let loginResult = await postSystemLogin({
          id: req.body.id,
          password: req.body.password,
        });

        if (
          "type" in loginResult &&
          loginResult.type === LoginFailType.Forbidden
        ) {
          // Activate VPN by login
          const vpnLoginResult = await vpnLogin(req.body);

          if (vpnLoginResult.success)
            loginResult = await postSystemLogin({
              id: req.body.id,
              password: req.body.password,
            });
          else console.error("VPN login failed", vpnLoginResult);
        }

        // 获得信息
        if (loginResult.success) {
          const studentInfo = await getPostInfo(
            loginResult.cookieStore.getHeader(MAIN_URL),
          );

          if (studentInfo.success) info = { ...info, ...studentInfo.info };
        }
      }

      return res.json(<AuthInitResponse>{
        success: true,
        info,
      });
    }

    return res.json(result);
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);

    return res.json(<CommonFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
