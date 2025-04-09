import { ActionFailType } from "@/config/index.js";
import type { CommonSuccessResponse } from "@/typings.js";

import { getPasswordRule } from "../get-password-rule.js";
import { RESET_PREFIX } from "../utils.js";

export interface ActivateValidSmsOptions {
  type: "validate-sms";
  sign: string;
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
  message: string;
  messages: string;
  result: null;
}

type RawValidSmsResponse =
  | RawValidSmsSuccessResponse
  | RawValidSmsFailedResponse;

export type ActivateValidSmsSuccessResponse = CommonSuccessResponse<{
  loginNo: string;
  sign: string;
  rules: string[];
}>;

export interface ActivateValidSmsConflictResponse {
  success: false;
  type: ActionFailType.Conflict | ActionFailType.WrongCaptcha;
  msg: string;
}

export type ActivateValidSmsResponse =
  | ActivateValidSmsSuccessResponse
  | ActivateValidSmsConflictResponse;

export const validateActivateSms = async (
  { sign, code }: ActivateValidSmsOptions,
  cookieHeader: string,
): Promise<ActivateValidSmsResponse> => {
  const response = await fetch(
    `${RESET_PREFIX}/accountActivation/checkValidateCode`,
    {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({ sign, validateCode: code }),
    },
  );

  const data = (await response.json()) as RawValidSmsResponse;

  if (!data.success)
    return {
      success: false,
      type: ActionFailType.WrongCaptcha,
      msg: data.messages,
    };

  const result = await getPasswordRule(cookieHeader);

  return {
    success: true,
    data: { ...data.result, rules: result.data },
  };
};
