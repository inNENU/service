import { ACTIVATE_PREFIX } from "./utils.js";
import { ActionFailType } from "../../config/index.js";
import type { CommonSuccessResponse } from "../../typings.js";

export interface ActivateValidEmailOptions {
  type: "valid-email";
  sign: string;
  mobile: string;
  code: string;
}

interface RawValidEmailSuccessResponse {
  code: "0";
  success: true;
  result: {
    loginNo: string;
    sign: string;
  };
}

interface RawValidEmailFailedResponse {
  code: "0";
  success: false;
  messages: string;
}

type RawValidEmailResponse =
  | RawValidEmailSuccessResponse
  | RawValidEmailFailedResponse;

export type ActivateSuccessResponse = CommonSuccessResponse<{
  loginNo: string;
  sign: string;
}>;

export interface ActivateValidEmailConflictResponse {
  success: false;
  type: ActionFailType.Conflict | ActionFailType.WrongCaptcha;
  msg: string;
}

export type ActivateValidEmailResponse =
  | ActivateSuccessResponse
  | ActivateValidEmailConflictResponse;

// e.checkValidateCode
export const validateActivateEmail = async (
  { sign, code, mobile }: ActivateValidEmailOptions,
  cookieHeader: string,
): Promise<ActivateValidEmailResponse> => {
  const response = await fetch(
    // FIXME: url
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

  const content = (await response.json()) as RawValidEmailResponse;

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
