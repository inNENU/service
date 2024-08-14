import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import {
  ActionFailType,
  InvalidArgResponse,
  MissingCredentialResponse,
  UnknownResponse,
} from "../../config/index.js";
import type { CommonFailedResponse } from "../../typings.js";
import { middleware } from "../../utils/index.js";
import { AUTH_SERVER, RE_AUTH_URL } from "../utils.js";

const RE_AUTH_VERIFY_URL = `${AUTH_SERVER}/authserver/reAuthCheck/reAuthSubmit.do`;

interface RawVerifyReAuthCaptchaResponse {
  code: "reAuth_success" | "reAuth_failed";
  msg: string;
}

export interface VerifyReAuthCaptchaSuccessResponse {
  success: true;
  /** 二次认证令牌 */
  authToken: string;
  cookies: CookieType[];
}

export type VerifyReAuthCaptchaResponse =
  | VerifyReAuthCaptchaSuccessResponse
  | CommonFailedResponse<ActionFailType.WrongCaptcha | ActionFailType.Unknown>;

export const verifyReAuthCaptcha = async (
  cookieHeader: string,
  smsCode: string,
): Promise<VerifyReAuthCaptchaResponse> => {
  const response = await fetch(RE_AUTH_VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: cookieHeader,
      Referer: RE_AUTH_URL,
      "User-Agent": "inNENU",
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
  });

  const result = (await response.json()) as RawVerifyReAuthCaptchaResponse;

  if (result.code !== "reAuth_success") {
    if (result.msg === "验证码错误") {
      return {
        success: false,
        type: ActionFailType.WrongCaptcha,
        msg: "验证码错误",
      };
    }

    return UnknownResponse(result.msg);
  }

  const cookieStore = new CookieStore();

  cookieStore.applyResponse(response, RE_AUTH_VERIFY_URL);

  const cookies = cookieStore.getAllCookies().map((item) => item.toJSON());

  return {
    success: true,
    authToken: cookieStore.getValue("MULTIFACTOR_USERS", {})!,
    cookies,
  };
};

export interface ReAuthVerifyOptions {
  /** 短信验证码 */
  smsCode: string;
}

export const verifyReAuthHandler = middleware<
  VerifyReAuthCaptchaResponse,
  ReAuthVerifyOptions
>(async (req, res) => {
  const cookieHeader = req.headers.cookie;
  const { smsCode } = req.body;

  if (!cookieHeader) return MissingCredentialResponse;
  if (!smsCode) return InvalidArgResponse("smsCode");

  const result = await verifyReAuthCaptcha(cookieHeader, smsCode);

  if (result.success) {
    result.cookies.forEach(({ name, value, ...rest }) => {
      res.cookie(name, value, rest);
    });
  }

  return res.json(result);
});
