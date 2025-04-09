import { ActionFailType, UnknownResponse } from "@/config/index.js";
import type { CommonFailedResponse, CommonSuccessResponse } from "@/typings.js";

import { authEncrypt } from "../encrypt.js";
import type { ResetCaptchaInfo } from "../reset-captcha.js";
import { getResetCaptcha } from "../reset-captcha.js";
import { RESET_PREFIX, RESET_SALT } from "../utils.js";

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

export interface ActivateSendSmsOptions {
  type: "send-sms";
  sign: string;
  mobile: string;
  captcha: string;
  captchaId: string;
}

export type ActivateSendSmsSuccessResponse = CommonSuccessResponse<{
  remainTime: number;
  sign: string;
}>;

export type ActivateSendSmsResponse =
  | ActivateSendSmsSuccessResponse
  | (CommonFailedResponse<ActionFailType.WrongCaptcha> & {
      data: ResetCaptchaInfo;
    })
  | CommonFailedResponse<ActionFailType.Restricted | ActionFailType.Unknown>;

export const sendActivateSms = async (
  { sign, mobile, captcha, captchaId }: ActivateSendSmsOptions,
  cookieHeader: string,
): Promise<ActivateSendSmsResponse> => {
  const response = await fetch(
    `${RESET_PREFIX}/accountActivation/queryValidateCodeByMobile`,
    {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sign,
        accountType: 1,
        accountNum: authEncrypt(mobile, RESET_SALT),
        captcha,
        captchaId,
      }),
    },
  );

  const data = (await response.json()) as RawSendSmsResponse;

  if (!data.success) {
    if (data.message === "验证码不正确") {
      const captchaResponse = await getResetCaptcha();

      if (!captchaResponse.success) return captchaResponse;

      return {
        success: false,
        type: ActionFailType.WrongCaptcha,
        msg: data.message,
        data: captchaResponse.data,
      };
    }

    return UnknownResponse(data.message);
  }

  return {
    success: true,
    data: {
      remainTime: data.remainTime,
      sign: data.result.sign,
    },
  };
};
