import { ActionFailType, UnknownResponse } from "@/config/index.js";
import type { CommonFailedResponse, CommonSuccessResponse } from "@/typings.js";

import type { ResetCaptchaInfo } from "../reset-captcha.js";
import { RESET_PAGE_URL } from "./utils.js";
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
      host: "authserver.nenu.edu.cn",
      "sec-ch-ua-platform": '"Windows"',
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
      accept: "application/json",
      "sec-ch-ua":
        '"Microsoft Edge";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      "content-type": "application/json",
      dnt: "1",
      "sec-ch-ua-mobile": "?0",
      origin: "https://authserver.nenu.edu.cn",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      referer:
        "https://authserver.nenu.edu.cn/retrieve-password/retrievePassword/index.html",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      priority: "u=1, i",
      cookie: cookieHeader,
    },
    body: JSON.stringify({
      accountId: "",
      loginNo: id,
      cellphone: "",
      email: "",
      hideCellphone: "",
      hideEmail: "",
      captchaId,
      captcha,
      code: "",
      type: "cellphone",
      password: "",
      confirmPassword: "",
      sign: "",
    }),
  });

  const data = (await verifyResponse.json()) as RawResetPasswordGetInfoData;

  if (data.code !== "0") {
    if (data.message === "验证码错误") {
      const captchaResponse = await getResetCaptcha(
        cookieHeader,
        RESET_PAGE_URL,
      );

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

  const captchaResponse = await getResetCaptcha(cookieHeader, RESET_PAGE_URL);

  if (!captchaResponse.success) return captchaResponse;

  const { isAppealFlag, hideCellphone, hideEmail, sign, appealSign } =
    JSON.parse(data.datas) as RawResetPasswordGetInfoParsedData;

  // 调用 getCountryCodeList，这是必需的预备调用
  await fetch(`${RESET_PREFIX}/getCountryCodeList`, {
    method: "GET",
    headers: {
      host: "authserver.nenu.edu.cn",
      "sec-ch-ua-platform": '"Windows"',
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
      accept: "application/json",
      "sec-ch-ua":
        '"Microsoft Edge";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      "content-type": "application/json",
      dnt: "1",
      "sec-ch-ua-mobile": "?0",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      referer:
        "https://authserver.nenu.edu.cn/retrieve-password/retrievePassword/index.html",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      priority: "u=1, i",
      cookie: cookieHeader,
    },
  });

  // 调用 getRetrieveOtherMethod，这是必需的后续调用
  await fetch(`${RESET_PREFIX}/getRetrieveOtherMethod`, {
    method: "POST",
    headers: {
      host: "authserver.nenu.edu.cn",
      "user-agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
      accept: "application/json",
      "content-type": "application/json",
      dnt: "1",
      origin: "https://authserver.nenu.edu.cn",
      "sec-fetch-site": "same-origin",
      "sec-fetch-mode": "cors",
      "sec-fetch-dest": "empty",
      referer:
        "https://authserver.nenu.edu.cn/retrieve-password/retrievePassword/index.html",
      "accept-encoding": "gzip, deflate, br, zstd",
      "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
      priority: "u=1, i",
      "sec-ch-ua":
        '"Microsoft Edge";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      cookie: cookieHeader,
    },
    body: JSON.stringify({ sign }),
  });

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
