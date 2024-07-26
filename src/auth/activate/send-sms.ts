import { INFO_SALT } from "./utils.js";
import { UnknownResponse } from "../../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import { authEncrypt } from "../auth-encrypt.js";
import { AUTH_SERVER } from "../utils.js";

interface RawSendSmsSuccessResponse {
  code: "0";
  success: true;
  remainTime: number;
  result: {
    sign: string;
  };
}

interface RawSendSmsFailedResponse {
  code: "0";
  success: false;
  remainTIme: number;
  message: string;
}

type RawSendSmsResponse = RawSendSmsSuccessResponse | RawSendSmsFailedResponse;

export interface ActivatePhoneSmsOptions {
  type: "send-sms";
  sign: string;
  mobile: string;
  captcha: string;
  captchaId: string;
}

export type ActivatePhoneSmsSuccessResponse = CommonSuccessResponse<{
  remainTime: number;
  sign: string;
}>;

export type ActivatePhoneSmsResponse =
  | ActivatePhoneSmsSuccessResponse
  | CommonFailedResponse;

// e.getMobileCode({
export const sendActivateSms = async (
  { sign, mobile, captcha, captchaId }: ActivatePhoneSmsOptions,
  cookieHeader: string,
): Promise<ActivatePhoneSmsResponse> => {
  const sendCodeResponse = await fetch(
    `${AUTH_SERVER}/queryValidateCodeByMobile`,
    {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({
        sign,
        accountType: 1,
        accountNum: authEncrypt(mobile, INFO_SALT),
        captcha,
        captchaId,
      }),
    },
  );

  const sendCodeResult = (await sendCodeResponse.json()) as RawSendSmsResponse;

  if (!sendCodeResult.success) return UnknownResponse(sendCodeResult.message);

  return {
    success: true,
    data: {
      remainTime: sendCodeResult.remainTime,
      sign: sendCodeResult.result.sign,
    },
  };
};
