import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import {
  ActionFailType,
  MissingArgResponse,
  MissingCredentialResponse,
  UnknownResponse,
} from "@/config/index.js";
import type { CommonFailedResponse } from "@/typings.js";
import { request } from "@/utils/index.js";

import type { AuthInfo } from "../init/info.js";
import { getAuthInfo } from "../init/info.js";
import {
  AUTH_INDEX_URL,
  AUTH_LOGIN_URL,
  AUTH_SERVER,
  RE_AUTH_URL,
} from "../utils.js";

const RE_AUTH_VERIFY_URL = `${AUTH_SERVER}/authserver/reAuthCheck/reAuthSubmit.do`;

interface RawVerifyReAuthCaptchaResponse {
  code: "reAuth_success" | "reAuth_failed";
  msg: string;
}

export interface ReAuthVerifyOptions {
  /** 短信验证码 */
  smsCode: string;
  /** 用户学号 */
  id: number;
  /** 用户密码 */
  password: string;
  /** OPEN ID */
  openid: string;
  /** 应用 ID */
  appId: string | number;
}

export interface VerifyReAuthCaptchaSuccessResponse {
  success: true;
  /** 二次认证令牌 */
  authToken: string;
  cookies: CookieType[];
  info: AuthInfo | null;
}

export type VerifyReAuthCaptchaResponse =
  | VerifyReAuthCaptchaSuccessResponse
  | CommonFailedResponse<
      | ActionFailType.BlackList
      | ActionFailType.Forbidden
      | ActionFailType.MissingArg
      | ActionFailType.MissingCredential
      | ActionFailType.Unknown
      | ActionFailType.WrongCaptcha
    >;

export const verifyReAuthCaptcha = async (
  { id, password, openid, appId, smsCode }: ReAuthVerifyOptions,
  cookieHeader: string,
): Promise<VerifyReAuthCaptchaResponse> => {
  try {
    const reAuthResponse = await fetch(RE_AUTH_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookieHeader,
        Referer: RE_AUTH_URL,
        "User-Agent": "inNENU service",
      },
      body: new URLSearchParams({
        dynamicCode: smsCode,
        service: "",
        reAuthType: "3",
        isMultifactor: "true",
        password: "",
        uuid: "",
        answer1: "",
        answer2: "",
        otpCode: "",
        skipTmpReAuth: "true",
      }),
      signal: AbortSignal.timeout(5000),
    });

    const reAuthResult =
      (await reAuthResponse.json()) as RawVerifyReAuthCaptchaResponse;

    if (reAuthResult.code !== "reAuth_success") {
      if (reAuthResult.msg === "验证码错误") {
        return {
          success: false,
          type: ActionFailType.WrongCaptcha,
          msg: "验证码错误",
        };
      }

      return UnknownResponse(reAuthResult.msg);
    }

    const cookieStore = new CookieStore();

    cookieStore.applyResponse(reAuthResponse, RE_AUTH_VERIFY_URL);

    const loginResponse = await fetch(AUTH_LOGIN_URL, {
      headers: {
        Cookie: `${cookieHeader}; ${cookieStore.getHeader(AUTH_SERVER)}`,
        "User-Agent": "inNENU service",
      },
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });

    if (
      loginResponse.status !== 302 ||
      loginResponse.headers.get("Location") !== AUTH_INDEX_URL
    ) {
      return UnknownResponse("登录失败，二次验证回调失败");
    }

    cookieStore.applyResponse(loginResponse, AUTH_LOGIN_URL);

    const authToken = cookieStore.getValue("MULTIFACTOR_USERS", {})!;

    const authInfo = await getAuthInfo(
      { id, password, authToken, appId, openid },
      cookieStore,
    );

    if (!authInfo.success) return authInfo;

    const cookies = cookieStore.getAllCookies().map((item) => item.toJSON());

    return {
      success: true,
      authToken,
      cookies,
      info: authInfo.info,
    };
  } catch (error) {
    console.error("二次认证失败: ", error);

    return UnknownResponse("二次认证失败，请稍后再试");
  }
};

export const verifyReAuthHandler = request<
  VerifyReAuthCaptchaResponse,
  ReAuthVerifyOptions
>(async (req, res) => {
  const cookieHeader = req.headers.cookie;
  const { smsCode, id, password, openid, appId } = req.body;

  if (!cookieHeader) return res.json(MissingCredentialResponse);
  if (!smsCode) return res.json(MissingArgResponse("smsCode"));
  if (!id) return res.json(MissingArgResponse("id"));
  if (!password) return res.json(MissingArgResponse("password"));
  if (!openid) return res.json(MissingArgResponse("openid"));
  if (!appId) return res.json(MissingArgResponse("appId"));

  const result = await verifyReAuthCaptcha(req.body, cookieHeader);

  if (result.success) {
    result.cookies.forEach(({ name, value, ...rest }) => {
      res.cookie(name, value, rest);
    });
  }

  return res.json(result);
});
