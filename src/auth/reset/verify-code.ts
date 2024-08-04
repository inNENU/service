import { ActionFailType } from "../../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import { INFO_SALT } from "../activate/utils.js";
import { authEncrypt } from "../auth-encrypt.js";
import { getPasswordRule } from "../get-password-rule.js";
import type { ResetCaptchaInfo } from "../reset-captcha.js";
import { getResetCaptcha } from "../reset-captcha.js";
import { RESET_PREFIX } from "../utils.js";

const VERIFY_CODE_URL = `${RESET_PREFIX}/passwordRetrieve/checkCode`;

interface RawResetPasswordVerifyCodeInfo {
  limitTime: number;
  sign: string;
}

interface RawResetPasswordVerifyCodeSuccessData {
  code: "0";
  message: null;
  datas: string;
}

interface RawResetPasswordVerifyCodeFailedData {
  code: "2106990000";
  message: string;
  datas: null;
}

type RawResetPasswordVerifyCodeData =
  | RawResetPasswordVerifyCodeSuccessData
  | RawResetPasswordVerifyCodeFailedData;

export interface ResetPasswordVerifyCodeOptions {
  type: "verify-code";
  /** 学号 */
  id: string;
  /** 验证码图片 base64 字符串 */
  captcha: string;
  /** 验证码 ID */
  captchaId: string;
  /** 代码 */
  code: string;

  cellphone: string;
  email: string;
  hideCellphone: string;
  hideEmail: string;
  isAppealFlag: "0" | "1";
  appealSign: string;
  sign: string;
}

export type ResetPasswordVerifyCodeSuccessResponse = CommonSuccessResponse<{
  limitTime: number;
  sign: string;
  rules: string[];
}>;

export type ResetPasswordVerifyCodeResponse =
  | ResetPasswordVerifyCodeSuccessResponse
  | (CommonFailedResponse<ActionFailType.WrongCaptcha> & {
      data: ResetCaptchaInfo;
    })
  | CommonFailedResponse<ActionFailType.Restricted | ActionFailType.Unknown>;

export const verifyCode = async (
  {
    id,
    captcha,
    captchaId,
    code,
    cellphone,
    email,
    hideCellphone,
    hideEmail,
    isAppealFlag,
    appealSign,
    sign,
  }: ResetPasswordVerifyCodeOptions,
  cookieHeader: string,
): Promise<ResetPasswordVerifyCodeResponse> => {
  const verifyResponse = await fetch(VERIFY_CODE_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Cookie: cookieHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "cellphone",
      loginNo: id,
      captcha,
      captchaId,
      hideCellphone,
      hideEmail,
      cellphone: cellphone ? authEncrypt(cellphone, INFO_SALT) : "",
      email: email ? authEncrypt(email, INFO_SALT) : "",
      code,
      password: "",
      confirmPassword: "",
      isAppealFlag,
      appealSign,
      sign,
    }),
  });

  const data = (await verifyResponse.json()) as RawResetPasswordVerifyCodeData;

  if (data.code !== "0") {
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

    return {
      success: false,
      type: ActionFailType.Unknown,
      msg: data.message,
    };
  }

  const result = await getPasswordRule(cookieHeader);

  return {
    success: true,
    data: {
      ...(JSON.parse(data.datas) as RawResetPasswordVerifyCodeInfo),
      rules: result.data,
    },
  };
};
