import { INFO_SALT } from "./utils.js";
import { UnknownResponse } from "../../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import { authEncrypt } from "../auth-encrypt.js";
import { AUTH_SERVER } from "../utils.js";

interface RawSendEmailSuccessResponse {
  code: "0";
  success: true;
  remainTime: number;
  result: {
    sign: string;
  };
}

interface RawSendEmailFailedResponse {
  code: "0";
  success: false;
  remainTIme: number;
  message: string;
}

type RawSendEmailResponse =
  | RawSendEmailSuccessResponse
  | RawSendEmailFailedResponse;

export interface ActivatePhoneEmailOptions {
  type: "send-email";
  sign: string;
  service: string;
  email: string;
}

export type ActivatePhoneEmailSuccessResponse = CommonSuccessResponse<{
  remainTime: number;
  sign: string;
}>;

export type ActivatePhoneEmailResponse =
  | ActivatePhoneEmailSuccessResponse
  | CommonFailedResponse;

// Note: e.sendEmail({
export const sendActivateEmail = async (
  { sign, service, email }: ActivatePhoneEmailOptions,
  cookieHeader: string,
): Promise<ActivatePhoneEmailResponse> => {
  const sendCodeResponse = await fetch(`${AUTH_SERVER}/sendEmail`, {
    method: "POST",
    headers: {
      Cookie: cookieHeader,
      "Content-Type": "application/json;charset=UTF-8",
    },
    body: JSON.stringify({
      sign,
      accountType: 2,
      accountNum: authEncrypt(email, INFO_SALT),
      service,
    }),
  });

  const sendCodeResult =
    (await sendCodeResponse.json()) as RawSendEmailResponse;

  if (!sendCodeResult.success) return UnknownResponse(sendCodeResult.message);

  return {
    success: true,
    data: {
      remainTime: sendCodeResult.remainTime,
      sign: sendCodeResult.result.sign,
    },
  };
};
