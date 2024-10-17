import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import { RESET_PREFIX } from "./utils.js";
import type { ActionFailType } from "../config/index.js";
import { RestrictedResponse, UnknownResponse } from "../config/index.js";
import type { CommonFailedResponse } from "../typings.js";
import { generateRandomString, request } from "../utils/index.js";

const CAPTCHA_URL = `${RESET_PREFIX}/generateCaptcha`;

export interface ResetCaptchaInfo {
  /** 验证码图片 base64 字符串 */
  captcha: string;
  /** 验证码 ID */
  captchaId: string;
}

export interface ResetCaptchaSuccessResult {
  success: true;
  cookieStore: CookieStore;
  data: ResetCaptchaInfo;
}

export type ResetCaptchaResult =
  | ResetCaptchaSuccessResult
  | CommonFailedResponse<ActionFailType.Restricted | ActionFailType.Unknown>;

export const getResetCaptcha = async (
  cookieHeaderOrStore?: string | CookieStore,
  referer = "",
): Promise<ResetCaptchaResult> => {
  const cookieStore =
    cookieHeaderOrStore instanceof CookieStore
      ? cookieHeaderOrStore
      : new CookieStore();

  const captchaId = generateRandomString(16);
  const imageResponse = await fetch(
    `${CAPTCHA_URL}?ltId=${captchaId}&codeType=2`,
    {
      headers: {
        Cookie:
          cookieHeaderOrStore instanceof CookieStore
            ? cookieStore.getHeader(CAPTCHA_URL)
            : typeof cookieHeaderOrStore === "string"
              ? cookieHeaderOrStore
              : "",
        Referer: referer,
      },
    },
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

export interface ResetCaptchaSuccessResponse {
  success: true;
  cookies: CookieType[];
  data: ResetCaptchaInfo;
}

export type ResetCaptchaResponse =
  | ResetCaptchaSuccessResponse
  | CommonFailedResponse<ActionFailType.Restricted | ActionFailType.Unknown>;

export const resetCaptchaHandler = request<ResetCaptchaResponse>(
  async (req, res) => {
    const result = await getResetCaptcha(req.headers.cookie ?? "");

    if (!result.success) return result;

    const { cookieStore, data } = result;

    const cookies = cookieStore.getAllCookies().map((item) => item.toJSON());

    cookies.forEach(({ name, value, ...rest }) => {
      res.cookie(name, value, rest);
    });

    return res.json({
      success: true,
      cookies,
      data: {
        captcha: data.captcha,
        captchaId: data.captchaId,
      },
    });
  },
);
