import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";
import type { RequestHandler } from "express";

import { AUTH_SERVER, RE_AUTH_URL } from "./utils.js";
import {
  ActionFailType,
  InvalidArgResponse,
  UnknownResponse,
} from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
  EmptyObject,
} from "../typings.js";

const RE_AUTH_SMS_URL = `${AUTH_SERVER}/authserver/dynamicCode/getDynamicCodeByReauth.do`;

interface RawReAuthSMSSuccessResponse {
  res: "success";
  mobile: string;
  returnMessage: string;
  codeTime: number;
}

interface RawReAuthSMSFrequentResponse {
  res: "code_time_fail";
  codeTime: number;
  returnMessage: string;
}

interface RawReAuthSMSFailResponse {
  res: `${string}_fail`;
  codeTime: number;
  returnMessage: string;
}

type RawReAuthSMSResponse =
  | RawReAuthSMSSuccessResponse
  | RawReAuthSMSFrequentResponse
  | RawReAuthSMSFailResponse;

type ReAuthSMSSuccessResponse = CommonSuccessResponse<{
  /** 下一个验证码的间隔秒数 */
  codeTime: number;
  /** 手机号 */
  hiddenCellphone: string;
}>;

export type ReAuthSMSResponse =
  | ReAuthSMSSuccessResponse
  | (CommonFailedResponse<ActionFailType.TooFrequent> & { codeTime: number })
  | CommonFailedResponse<ActionFailType.Unknown>;

export const sendReAuthSMS = async (
  cookieHeader: string,
  id: string,
): Promise<ReAuthSMSResponse> => {
  await fetch(RE_AUTH_URL, {
    headers: {
      Cookie: cookieHeader,
      "User-Agent": "inNENU",
    },
    redirect: "manual",
  });

  const response = await fetch(RE_AUTH_SMS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: cookieHeader,
      Referer: RE_AUTH_URL,
      "User-Agent": "inNENU",
    },
    body: `userName=${id}&authCodeTypeName=reAuthDynamicCodeType`,
  });

  const result = (await response.json()) as RawReAuthSMSResponse;

  if (result.res === "code_time_fail")
    return {
      success: false,
      type: ActionFailType.TooFrequent,
      msg: result.returnMessage,
      codeTime: result.codeTime,
    };

  if (result.res !== "success") return UnknownResponse(result.returnMessage);

  return {
    success: true,
    data: {
      codeTime: result.codeTime,
      hiddenCellphone: result.mobile,
    },
  };
};

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

export interface ReAuthSmsOptions {
  type: "sms";
  /** 学号 */
  id: string;
  cookie?: CookieType[];
}

export interface ReAuthVerifyOptions {
  type: "verify";
  /** 短信验证码 */
  smsCode: string;
  cookie?: CookieType[];
}

export type ReAuthOptions = ReAuthSmsOptions | ReAuthVerifyOptions;

export const reAuthHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  ReAuthOptions
> = async (req, res) => {
  try {
    const cookieHeader = req.body.cookie
      ? req.body.cookie.map(({ name, value }) => `${name}=${value}`).join("; ")
      : req.headers.cookie;

    if (!cookieHeader) throw new Error("Cookie not found");

    if (req.method === "GET") {
      const id = req.query.id as string;

      if (!id) return InvalidArgResponse("id");

      return res.json(await sendReAuthSMS(cookieHeader, id));
    }

    if ("id" in req.body) {
      return res.json(await sendReAuthSMS(cookieHeader, req.body.id));
    }

    const smsCode = req.body.smsCode;

    if (!smsCode) return InvalidArgResponse("id or smsCode");

    const result = await verifyReAuthCaptcha(cookieHeader, smsCode);

    if (result.success) {
      result.cookies.forEach(({ name, value, ...rest }) => {
        res.cookie(name, value, rest);
      });
    }

    return res.json(result);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};
