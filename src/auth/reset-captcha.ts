import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import { generateRandomString, request } from "@/utils/index.js";

import { RESET_PREFIX } from "./utils.js";
import type { ActionFailType } from "../config/index.js";
import { RestrictedResponse, UnknownResponse } from "../config/index.js";
import type { CommonFailedResponse } from "../typings.js";

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
        host: "authserver.nenu.edu.cn",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36 Edg/137.0.0.0",
        accept:
          "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        dnt: "1",
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "no-cors",
        "sec-fetch-dest": "image",
        referer:
          referer ||
          "https://authserver.nenu.edu.cn/retrieve-password/retrievePassword/index.html",
        "accept-encoding": "gzip, deflate, br, zstd",
        "accept-language": "zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6",
        "sec-ch-ua":
          '"Microsoft Edge";v="137", "Chromium";v="137", "Not/A)Brand";v="24"',
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": '"Windows"',
        cookie:
          cookieHeaderOrStore instanceof CookieStore
            ? cookieStore.getHeader(CAPTCHA_URL)
            : typeof cookieHeaderOrStore === "string"
              ? cookieHeaderOrStore
              : "",
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
