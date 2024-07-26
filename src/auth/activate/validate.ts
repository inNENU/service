import { CookieStore } from "@mptool/net";

import { INFO_SALT } from "./utils.js";
import type { ActionFailType } from "../../config/index.js";
import { UnknownResponse } from "../../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import { authEncrypt } from "../auth-encrypt.js";
import type { ActivateCaptchaInfo } from "../reset-captcha.js";
import { getResetCaptcha } from "../reset-captcha.js";
import { RESET_PREFIX } from "../utils.js";

interface RawValidSuccessResponse {
  success: true;
  code: "0";
  remainTime: number;
  result: {
    sign: string;
    loginNo: string;
  };
}

interface RawValidFailResponse {
  success: false;
  code: "0";
  remainTime: number;
  result: null;
  message: string;
  messages: string;
}

type RawValidResponse = RawValidSuccessResponse | RawValidFailResponse;

export interface ActivateValidOptions {
  type: "valid";
  name: string;
  schoolId: string;
  idType: number;
  id: string;
  captcha: string;
  captchaId: string;
}

export type ActivateValidSuccessResponse = CommonSuccessResponse<
  ActivateCaptchaInfo & { sign: string; loginNo: string }
>;

export type ActivateValidResponse =
  | ActivateValidSuccessResponse
  | CommonFailedResponse<ActionFailType.Restricted | ActionFailType.Unknown>;

// NOTE: e.checkValidateCode(
export const validAccountInfo = async (
  { schoolId, name, id, idType, captcha, captchaId }: ActivateValidOptions,
  cookieHeader: string,
): Promise<ActivateValidResponse> => {
  const cookieStore = new CookieStore();

  const response = await fetch(
    `${RESET_PREFIX}/accountActivation/queryAccountByLoginNoAndId`,
    {
      method: "POST",
      headers: {
        Cookie: cookieHeader,
        "Content-Type": "application/json;charset=UTF-8",
      },
      body: JSON.stringify({
        loginNo: schoolId,
        loginName: name,
        captcha,
        captchaId,
        idType,
        idNo: authEncrypt(id, INFO_SALT),
      }),
    },
  );

  const activateResult = (await response.json()) as RawValidResponse;

  if (!activateResult.success) return UnknownResponse(activateResult.message);

  const captchaResponse = await getResetCaptcha(cookieStore);

  if (!captchaResponse.success) return captchaResponse;

  return {
    success: true,
    data: {
      ...captchaResponse.data,
      ...activateResult.result,
    },
  };
};
