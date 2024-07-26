import type { RequestHandler } from "express";

import { getActivateInfo } from "./get-info.js";
import type { ActivatePhoneSmsOptions } from "./send-sms.js";
import { sendActivateSms } from "./send-sms.js";
import { ACTIVATE_PREFIX } from "./utils.js";
import type { ActivateValidOptions } from "./validate.js";
import { validAccountInfo } from "./validate.js";
import { ActionFailType, UnknownResponse } from "../../config/index.js";
import type { CommonFailedResponse, EmptyObject } from "../../typings.js";
import { AUTH_SERVER } from "../utils.js";

export interface ActivateSuccessResponse {
  success: true;
}

export interface ActivateBindPhoneOptions {
  type: "bind-phone";
  sign: string;
  mobile: string;
  code: string;
}

interface RawPhoneSuccessResponse {
  code: 0;
  msg: "成功";
  data: { boundStaffNo: string } | Record<string, string>;
  message: string;
}

export interface ActivateBindPhoneConflictResponse {
  success: false;
  type: ActionFailType.Conflict | ActionFailType.WrongCaptcha;
  msg: string;
}
export type ActivateBindPhoneResponse =
  | ActivateSuccessResponse
  | ActivateBindPhoneConflictResponse;

const bindPhone = async (
  { sign, code, mobile }: ActivateBindPhoneOptions,
  cookieHeader: string,
): Promise<ActivateBindPhoneResponse> => {
  const response = await fetch(
    `${ACTIVATE_PREFIX}/accountActivation/checkValidateCode`,
    {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({ sign, mobile, checkCode: code }),
    },
  );

  const content = (await response.json()) as RawPhoneSuccessResponse;

  if (content.code !== 0)
    return {
      success: false,
      type: ActionFailType.WrongCaptcha,
      msg: content.message,
    };

  if (content.data.boundStaffNo)
    return {
      success: false,
      type: ActionFailType.Conflict,
      msg: `该手机号已绑定 ${content.data.boundStaffNo} 学号。`,
    };

  return {
    success: true,
  };
};

export interface ActivateReplacePhoneOptions {
  type: "replace-phone";
  sign: string;
  mobile: string;
  code: string;
}

export type ActivateReplacePhoneResponse =
  | ActivateSuccessResponse
  | CommonFailedResponse;

const replacePhone = async (
  { sign, code, mobile }: ActivateReplacePhoneOptions,
  cookieHeader: string,
): Promise<ActivateReplacePhoneResponse> => {
  const response = await fetch(
    `${AUTH_SERVER}/api/staff/activate/mobile/unbind`,
    {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({ sign, mobile, checkCode: code }),
    },
  );

  const content = (await response.json()) as RawPhoneSuccessResponse;

  if (content.code !== 0) return UnknownResponse(content.message);

  return {
    success: true,
  };
};

export interface ActivatePasswordOptions {
  type: "password";
  sign: string;
  password: string;
}

export type ActivatePasswordResponse =
  | ActivateSuccessResponse
  | CommonFailedResponse;

const setPassword = async (
  { sign, password }: ActivatePasswordOptions,
  cookieHeader: string,
): Promise<ActivatePasswordResponse> => {
  const response = await fetch(`${AUTH_SERVER}/api/staff/activate/password`, {
    method: "POST",
    headers: {
      Cookie: cookieHeader,
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: JSON.stringify({ sign, password }),
  });

  const content = (await response.json()) as {
    success: boolean;
    message: string;
  };

  if (!content.success) return UnknownResponse(content.message);

  return {
    success: true,
  };
};

export type ActivateOptions =
  | ActivateValidOptions
  | ActivatePhoneSmsOptions
  | ActivateBindPhoneOptions
  | ActivateReplacePhoneOptions
  | ActivatePasswordOptions;

export const activateHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  | ActivateValidOptions
  | ActivatePhoneSmsOptions
  | ActivateBindPhoneOptions
  | ActivateReplacePhoneOptions
  | ActivatePasswordOptions
> = async (req, res) => {
  try {
    if (req.method === "GET") {
      const response = await getActivateInfo();

      if ("cookieStore" in response) {
        const cookies = response.cookieStore
          .getAllCookies()
          .map((item) => item.toJSON());

        cookies.forEach(({ name, value, ...rest }) => {
          res.cookie(name, value, rest);
        });

        // @ts-expect-error: CookieStore is not serializable
        delete response.cookieStore;
      }

      return res.json(response);
    } else {
      const options = req.body;

      if (!req.headers.cookie) throw new Error(`Cookie is missing!`);

      const cookieHeader = req.headers.cookie;

      if (options.type === "valid")
        return res.json(validAccountInfo(options, cookieHeader));

      if (options.type === "send-sms")
        return res.json(sendActivateSms(options, cookieHeader));

      if (options.type === "bind-phone")
        return res.json(bindPhone(options, cookieHeader));

      if (options.type === "replace-phone")
        return res.json(replacePhone(options, cookieHeader));

      if (options.type === "password")
        return res.json(setPassword(options, cookieHeader));

      // @ts-expect-error: Type is not expected
      throw new Error(`Unknown type: ${options.type}`);
    }
  } catch (err) {
    const { message } = err as Error;

    console.error(err);

    return res.json({
      success: false,
      msg: message,
    } as CommonFailedResponse);
  }
};
