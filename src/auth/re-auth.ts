import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";
import type { RequestHandler } from "express";

import { AUTH_SERVER, RE_AUTH_URL } from "./utils.js";
import {
  ActionFailType,
  InvalidArgResponse,
  UnknownResponse,
} from "../config/index.js";
import type { CommonFailedResponse, EmptyObject } from "../typings.js";

const RE_AUTH_SMS_URL = `${AUTH_SERVER}/authserver/dynamicCode/getDynamicCodeByReauth.do`;

interface RawReAuthSMSSuccessResponse {
  res: "success";
  mobile: string;
  returnMessage: string;
  codeTime: number;
}

interface RawReAuthSMSFailResponse {
  res: "code_time_fail";
  codeTime: number;
  returnMessage: string;
}

type RawReAuthSMSResponse =
  | RawReAuthSMSSuccessResponse
  | RawReAuthSMSFailResponse;

interface ReAuthSMSSuccessResponse {
  success: true;
  codeTime: number;
}

export type ReAuthSMSResponse =
  | ReAuthSMSSuccessResponse
  | CommonFailedResponse<ActionFailType.Unknown>;

export const sendReAuthSMS = async (
  cookieHeader: string,
  id: string,
): Promise<ReAuthSMSResponse> => {
  await fetch(RE_AUTH_URL);

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

  if (result.res !== "success") return UnknownResponse(result.returnMessage);

  return {
    success: true,
    codeTime: result.codeTime,
  };
};

const RE_AUTH_VERIFY_URL = `${AUTH_SERVER}/authserver/reAuthCheck/reAuthSubmit.do`;

interface RawVerifyReAuthCaptchaResponse {
  code: "reAuth_success" | "reAuth_failed";
  msg: string;
}

export interface VerifyReAuthCaptchaSuccessResponse {
  success: true;
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

export type ReAuthOptions =
  | {
      type: "sms";
      id: string;
      cookie?: CookieType[];
    }
  | {
      type: "verify";
      smsCode: string;
      cookie?: CookieType[];
    };

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
