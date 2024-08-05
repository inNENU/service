import { ActionFailType } from "../../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../../typings.js";
import type { ResetCaptchaInfo } from "../reset-captcha.js";
import { getResetCaptcha } from "../reset-captcha.js";
import { RESET_PREFIX } from "../utils.js";

const GET_ID_INFO_URL = `${RESET_PREFIX}/passwordRetrieve/checkUserInfo`;

export interface RawResetPasswordGetInfoParsedData {
  isAppealFlag: "0" | "1";
  appealSign: string;
  sign: string;
  hideCellphone: string;
  hideEmail: string;
}

interface RawResetPasswordGetInfoSuccessData {
  code: "0";
  message: null;
  datas: string;
}

interface RawResetPasswordGetInfoFailedData {
  code: "2106990000";
  message: string;
  datas: null;
}

type RawResetPasswordGetInfoData =
  | RawResetPasswordGetInfoSuccessData
  | RawResetPasswordGetInfoFailedData;

export interface ResetPasswordGetInfoOptions {
  type: "get-info";
  /** 学号 */
  id: string;
  /** 验证码图片 base64 字符串 */
  captcha: string;
  /** 验证码 ID */
  captchaId: string;
}

export type ResetPasswordGetInfoSuccessResponse = CommonSuccessResponse<{
  /** 隐藏的手机号 */
  hideCellphone: string;
  /** 隐藏的邮箱 */
  hideEmail: string;
  isAppealFlag: "0" | "1";
  appealSign: string;
  sign: string;
  /** 验证码图片 base64 字符串 */
  captcha: string;
  /** 验证码 ID */
  captchaId: string;
}>;

export type ResetPasswordGetInfoResponse =
  | ResetPasswordGetInfoSuccessResponse
  | (CommonFailedResponse<ActionFailType.WrongCaptcha> & {
      data: ResetCaptchaInfo;
    })
  | CommonFailedResponse<ActionFailType.Restricted | ActionFailType.Unknown>;

export const getInfo = async (
  { id, captcha, captchaId }: ResetPasswordGetInfoOptions,
  cookieHeader: string,
): Promise<ResetPasswordGetInfoResponse> => {
  const verifyResponse = await fetch(GET_ID_INFO_URL, {
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

  const data = (await verifyResponse.json()) as RawResetPasswordGetInfoData;

  if (data.code !== "0") {
    if (data.message === "验证码错误") {
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

  const captchaResponse = await getResetCaptcha();

  if (!captchaResponse.success) return captchaResponse;

  const { isAppealFlag, hideCellphone, hideEmail, sign, appealSign } =
    JSON.parse(data.datas) as RawResetPasswordGetInfoParsedData;

  return {
    success: true,
    data: {
      isAppealFlag,
      appealSign,
      sign,
      hideCellphone,
      hideEmail,
      ...captchaResponse.data,
    },
  };
};
