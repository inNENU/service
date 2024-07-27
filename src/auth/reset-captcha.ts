import { CookieStore } from "@mptool/net";

import { RESET_PREFIX } from "./utils.js";
import type { ActionFailType } from "../config/index.js";
import { RestrictedResponse, UnknownResponse } from "../config/index.js";
import type {
  CommonFailedResponse,
  CommonSuccessResponse,
} from "../typings.js";
import { generateRandomString } from "../utils/generateRandomString.js";

const CAPTCHA_URL = `${RESET_PREFIX}/generateCaptcha`;

export interface ResetCaptchaInfo {
  /** 验证码图片 base64 字符串 */
  captcha: string;
  /** 验证码 ID */
  captchaId: string;
}

export type ResetCaptchaSuccessResponse =
  CommonSuccessResponse<ResetCaptchaInfo> & {
    cookieStore: CookieStore;
  };

export type ResetCaptchaResponse =
  | ResetCaptchaSuccessResponse
  | CommonFailedResponse<ActionFailType.Restricted | ActionFailType.Unknown>;

export const getResetCaptcha = async (
  cookieStore = new CookieStore(),
): Promise<ResetCaptchaResponse> => {
  const captchaId = generateRandomString(16);
  const imageResponse = await fetch(
    `${CAPTCHA_URL}?ltId=${captchaId}&codeType=2`,
  );

  if (imageResponse.headers.get("Content-Type") === "text/html")
    return RestrictedResponse;

  if (!imageResponse.headers.get("Content-Type")?.startsWith("image/jpeg")) {
    return UnknownResponse("获取验证码失败");
  }

  cookieStore.applyResponse(imageResponse, CAPTCHA_URL);

  return {
    success: true,
    data: {
      captcha: `data:image/jpeg;base64,${Buffer.from(
        await imageResponse.arrayBuffer(),
      ).toString("base64")}`,
      captchaId,
    },
    cookieStore,
  };
};