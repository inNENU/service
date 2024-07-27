import { CookieStore } from "@mptool/net";
import type { RequestHandler } from "express";

import type { ResetPasswordVerifyInfoOptions } from "./verify.js";
import { verifyAccountInfo } from "./verify.js";
import {
  ActionFailType,
  InvalidArgResponse,
  UnknownResponse,
} from "../../config/index.js";
import type { CommonFailedResponse, EmptyObject } from "../../typings.js";
import { authEncrypt } from "../auth-encrypt.js";
import { getResetCaptcha } from "../reset-captcha.js";
import { AUTH_SERVER } from "../utils.js";

const RESET_PASSWORD_URL = `${AUTH_SERVER}/authserver/getBackPassword.do`;

interface RawFailedData {
  success: false;
  data: Record<never, never>;
  code: number;
  message: string;
}

export interface ResetPasswordSendSMSOptions {
  /** 学号 */
  id: string;
  /** 手机号 */
  mobile: string;
  sign: string;
}

type RawResetPasswordSendSMSData =
  | {
      success: true;
      code: 0;
      message: null;
      data: {
        sign: string;
        msgTip: string;
      };
    }
  | RawFailedData;

interface ResetPasswordSendSMSSuccessResult {
  success: true;
  cookieStore: CookieStore;
  sign: string;
}

type ResetPasswordSendSMSResult =
  | ResetPasswordSendSMSSuccessResult
  | CommonFailedResponse;

const sendSMS = async (
  { id, mobile, sign }: ResetPasswordSendSMSOptions,
  cookieHeader: string,
): Promise<ResetPasswordSendSMSResult> => {
  const cookieStore = new CookieStore();
  const sendSMSResponse = await fetch(RESET_PASSWORD_URL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      userId: id,
      mobile,
      sign,
      type: "mobile",
      step: "2",
    }),
  });

  cookieStore.applyResponse(sendSMSResponse, RESET_PASSWORD_URL);

  const data = (await sendSMSResponse.json()) as RawResetPasswordSendSMSData;

  if (data.success)
    return {
      success: true,
      cookieStore,
      sign: data.data.sign,
    };

  return UnknownResponse(data.message);
};

export interface ResetPasswordVerifySMSOptions {
  /** 学号 */
  id: string;
  /** 手机号 */
  mobile: string;
  /** 验证码 */
  code: string;
  sign: string;
}

type RawResetPasswordVerifySMSData =
  | {
      success: true;
      code: 0;
      message: null;
      data: {
        sign: string;
        passwordPolicy: string;
        pwdDefaultEncryptSalt: string;
      };
    }
  | RawFailedData;

interface ResetPasswordVerifySMSSuccessResult {
  success: true;
  cookieStore: CookieStore;
  sign: string;
  salt: string;
}

type ResetPasswordVerifySMSResult =
  | ResetPasswordVerifySMSSuccessResult
  | CommonFailedResponse;

const verifySMS = async (
  { id, mobile, code, sign }: ResetPasswordVerifySMSOptions,
  cookieHeader: string,
): Promise<ResetPasswordVerifySMSResult> => {
  const cookieStore = new CookieStore();
  const verifySMSResponse = await fetch(RESET_PASSWORD_URL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      userId: id,
      mobile,
      code,
      sign,
      type: "mobile",
      step: "3",
    }),
  });

  cookieStore.applyResponse(verifySMSResponse, RESET_PASSWORD_URL);

  const data =
    (await verifySMSResponse.json()) as RawResetPasswordVerifySMSData;

  if (data.success)
    return {
      success: true,
      cookieStore,
      sign: data.data.sign,
      salt: data.data.pwdDefaultEncryptSalt,
    };

  return UnknownResponse(data.message);
};

export interface ResetPasswordSetNewOptions {
  /** 学号 */
  id: string;
  /** 手机号 */
  mobile: string;
  /** 验证码 */
  code: string;
  password: string;
  salt: string;
  sign: string;
}

type RawResetPasswordSetNewData =
  | {
      success: true;
      code: 0;
      message: null;
      data: {
        sign: string;
      };
    }
  | RawFailedData;

export interface ResetPasswordSetNewSuccessResponse {
  success: true;
}

export type ResetPasswordSetNewResponse =
  | ResetPasswordSetNewSuccessResponse
  | CommonFailedResponse<ActionFailType.WrongCaptcha | ActionFailType.Unknown>;

const setNewPassword = async (
  { id, mobile, code, password, salt, sign }: ResetPasswordSetNewOptions,
  cookieHeader: string,
): Promise<ResetPasswordSetNewResponse> => {
  const encryptPassword = authEncrypt(password, salt);

  const setNewPasswordResponse = await fetch(RESET_PASSWORD_URL, {
    method: "POST",
    headers: {
      Accept: "application/json, text/javascript, */*; q=0.01",
      Cookie: cookieHeader,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      userId: id,
      mobile,
      code,
      birthday: "null",
      answer: "null",
      sign,
      password: encryptPassword,
      confirmPassword: encryptPassword,
      type: "mobile",
      step: "4",
    }),
  });

  const data =
    (await setNewPasswordResponse.json()) as RawResetPasswordSetNewData;

  if (data.success)
    return {
      success: true,
    };

  return {
    success: false,
    type:
      data.code === 4 ? ActionFailType.WrongCaptcha : ActionFailType.Unknown,
    msg: data.message,
  };
};

export type ResetPasswordOptions =
  | ResetPasswordVerifyInfoOptions
  | ResetPasswordSendSMSOptions
  | ResetPasswordVerifySMSOptions
  | ResetPasswordSetNewOptions;

export interface ResetPasswordCaptchaResponse {
  success: true;
  captcha: string;
}

export interface ResetPasswordInfoSuccessResponse {
  success: true;
  sign: string;
}

export type ResetPasswordInfoResponse =
  | ResetPasswordInfoSuccessResponse
  | CommonFailedResponse;

export interface ResetPasswordSendSMSSuccessResponse {
  success: true;
  sign: string;
}

export type ResetPasswordSendSMSResponse =
  | ResetPasswordSendSMSSuccessResponse
  | CommonFailedResponse;

export interface ResetPasswordVerifySMSSuccessResponse {
  success: true;
  sign: string;
  salt: string;
}

export type ResetPasswordVerifySMSResponse =
  | ResetPasswordVerifySMSSuccessResponse
  | CommonFailedResponse;

export const resetPasswordHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  ResetPasswordOptions
> = async (req, res) => {
  try {
    if (req.method === "GET") {
      const result = await getResetCaptcha();

      if ("cookieStore" in result) {
        const cookies = result.cookieStore
          .getAllCookies()
          .map((item) => item.toJSON());

        cookies.forEach(({ name, value, ...rest }) => {
          res.cookie(name, value, rest);
        });

        // @ts-expect-error: cookieStore is not needed
        delete result.cookieStore;
      }

      return res.json(result);
    }

    const options = req.body;

    if ("captcha" in options) {
      return res.json(await verifyAccountInfo(options, req.headers.cookie!));
    }

    if ("sign" in options) {
      const result = await sendSMS(options, req.headers.cookie!);

      if (result.success) {
        const cookies = result.cookieStore
          .getAllCookies()
          .map((item) => item.toJSON());

        cookies.forEach(({ name, value, ...rest }) => {
          res.cookie(name, value, rest);
        });

        return res.json({
          success: true,
          sign: result.sign,
        } as ResetPasswordSendSMSSuccessResponse);
      }

      return res.json(result);
    }

    if ("code" in options) {
      const result = await verifySMS(options, req.headers.cookie ?? "");

      if (result.success) {
        const cookies = result.cookieStore
          .getAllCookies()
          .map((item) => item.toJSON());

        cookies.forEach(({ name, value, ...rest }) => {
          res.cookie(name, value, rest);
        });

        return res.json({
          success: true,
          sign: result.sign,
          salt: result.salt,
        } as ResetPasswordVerifySMSSuccessResponse);
      }

      return res.json(result);
    }

    if ("password" in options) {
      const result = await setNewPassword(options, req.headers.cookie ?? "");

      if (result.success)
        return res.json({
          success: true,
        } as ResetPasswordSetNewSuccessResponse);

      return res.json(result);
    }

    return res.json(InvalidArgResponse("options"));
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json(UnknownResponse(message));
  }
};