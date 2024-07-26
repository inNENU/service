import { ActionFailType } from "../../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import { RESET_PREFIX } from "../utils.js";

const VERIFY_INFO_URL = `${RESET_PREFIX}/passwordRetrieve/checkUserInfo`;

interface RawResetPasswordVerifyInfoSuccessData {
  code: "0";
  message: null;
  datas: string;
}

export interface RawResetPasswordInfoParsedData {
  isAppealFlag: "0" | "1";
  appealSign: string;
  sign: string;
  hideCellphone: string;
  hideEmail: string;
}

interface RawResetPasswordVerifyInfoFailedData {
  code: string;
  message: string;
  datas: null;
}

type RawResetPasswordInfoData =
  | RawResetPasswordVerifyInfoSuccessData
  | RawResetPasswordVerifyInfoFailedData;

export interface ResetPasswordVerifyInfoOptions {
  type: "verify-info";
  /** 学号 */
  id: string;
  /** 验证码图片 base64 字符串 */
  captcha: string;
  /** 验证码 ID */
  captchaId: string;
}

export type ResetPasswordVerifyInfoSuccessResponse = CommonSuccessResponse<{
  /** 隐藏的手机号 */
  hiddenPhone: string;
  sign: string;
}>;

export type ResetPasswordVerifyInfoResponse =
  | ResetPasswordVerifyInfoSuccessResponse
  | CommonFailedResponse<ActionFailType.Unknown>;

export const verifyAccountInfo = async (
  { id, captcha, captchaId }: ResetPasswordVerifyInfoOptions,
  cookieHeader: string,
): Promise<ResetPasswordVerifyInfoResponse> => {
  const verifyResponse = await fetch(VERIFY_INFO_URL, {
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
    }),
  });

  const data = (await verifyResponse.json()) as RawResetPasswordInfoData;

  if (data.code !== "0")
    return {
      success: false,
      type: ActionFailType.Unknown,
      msg: data.message!,
    };

  const { hideCellphone, sign } = JSON.parse(
    data.datas!,
  ) as RawResetPasswordInfoParsedData;

  return {
    success: true,
    data: { sign, hiddenPhone: hideCellphone },
  };
};
