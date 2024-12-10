import { RESET_PAGE_URL } from "./utils.js";
import { ActionFailType } from "../../config/index.js";
import type { CommonFailedResponse } from "../../typings.js";
import { authEncrypt } from "../encrypt.js";
import { RESET_PREFIX, RESET_SALT } from "../utils.js";

const RESET_PASSWORD_URL = `${RESET_PREFIX}/passwordRetrieve/resetPassword`;

interface RawResetPasswordSetSuccessData {
  code: "0";
  message: string;
  datas: null;
}

interface RawResetPasswordSetFailedData {
  code: "2106990000";
  message: string;
  datas: null;
}

type RawResetPasswordSetData =
  | RawResetPasswordSetSuccessData
  | RawResetPasswordSetFailedData;

export interface ResetPasswordSetOptions {
  type: "reset-password";
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
  password: string;
  isAppealFlag: "0" | "1";
  appealSign: string;
  sign: string;
}

export type ResetPasswordSetResponse = { success: true } | CommonFailedResponse;

export const resetPassword = async (
  {
    id,
    captcha,
    captchaId,
    code,
    cellphone,
    email,
    hideCellphone,
    hideEmail,
    password,
    isAppealFlag,
    appealSign,
    sign,
  }: ResetPasswordSetOptions,
  cookieHeader: string,
): Promise<ResetPasswordSetResponse> => {
  const verifyResponse = await fetch(RESET_PASSWORD_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      Cookie: cookieHeader,
      "Content-Type": "application/json",
      Referer: RESET_PAGE_URL,
    },
    body: JSON.stringify({
      type: "cellphone",
      loginNo: id,
      captcha,
      captchaId,
      hideCellphone,
      hideEmail,
      cellphone: cellphone ? authEncrypt(cellphone, RESET_SALT) : "",
      email: email ? authEncrypt(email, RESET_SALT) : "",
      code,
      password: authEncrypt(password, RESET_SALT),
      confirmPassword: authEncrypt(password, RESET_SALT),
      isAppealFlag,
      appealSign,
      sign,
    }),
  });

  const data = (await verifyResponse.json()) as RawResetPasswordSetData;

  if (data.code !== "0") {
    return {
      success: false,
      type: ActionFailType.Unknown,
      msg: data.message,
    };
  }

  return {
    success: true,
  };
};
