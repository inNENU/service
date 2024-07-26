import { ACTIVATE_PREFIX } from "./utils.js";
import { ActionFailType } from "../../config/index.js";
import type { CommonSuccessResponse } from "../../typings.js";

export interface ActivateValidSmsOptions {
  type: "valid-sms";
  sign: string;
  mobile: string;
  code: string;
}

interface RawValidSmsSuccessResponse {
  code: "0";
  success: true;
  result: {
    loginNo: string;
    sign: string;
  };
}

interface RawValidSmsFailedResponse {
  code: "0";
  success: false;
  messages: string;
}

type RawValidSmsResponse =
  | RawValidSmsSuccessResponse
  | RawValidSmsFailedResponse;

export type ActivateSuccessResponse = CommonSuccessResponse<{
  loginNo: string;
  sign: string;
}>;

export interface ActivateValidSmsConflictResponse {
  success: false;
  type: ActionFailType.Conflict | ActionFailType.WrongCaptcha;
  msg: string;
}

export type ActivateValidSmsResponse =
  | ActivateSuccessResponse
  | ActivateValidSmsConflictResponse;

// e.checkValidateCode
export const validateActivateSms = async (
  { sign, code, mobile }: ActivateValidSmsOptions,
  cookieHeader: string,
): Promise<ActivateValidSmsResponse> => {
  const response = await fetch(
    `${ACTIVATE_PREFIX}/accountActivation/checkValidateCode`,
    {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json;charset=UTF-8",
      },
      // FIXME:
      body: JSON.stringify({ sign, mobile, checkCode: code }),
    },
  );

  const content = (await response.json()) as RawValidSmsResponse;

  if (!content.success)
    return {
      success: false,
      type: ActionFailType.WrongCaptcha,
      msg: content.messages,
    };

  return {
    success: true,
    data: content.result,
  };
};
