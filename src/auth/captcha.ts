import type { CookieType } from "@mptool/net";

import { request } from "@/utils/index.js";

import { authEncrypt } from "./encrypt.js";
import { AUTH_CAPTCHA_URL, AUTH_LOGIN_URL, AUTH_SERVER } from "./utils.js";
import type { ActionFailType } from "../config/index.js";
import {
  MissingArgResponse,
  MissingCredentialResponse,
  UnknownResponse,
} from "../config/index.js";
import type { CommonFailedResponse } from "../typings.js";

/**
 * 滑块轨迹点接口
 */
export interface SliderTrackPoint {
  /** 滑块的水平位置（距离） */
  a: number;
  /** 滑块的垂直偏移量 */
  b: number;
  /** 时间差（毫秒） */
  c: number;
}

interface RawAuthCaptchaResponse {
  smallImage: string;
  bigImage: string;
  tagWidth: number;
  yHeight: number;
}

interface GetAuthCaptchaSuccessResponse {
  success: true;
  data: {
    /** 滑块图片 base64 字符串 */
    slider: string;
    /** 背景图片 base64 字符串 */
    bg: string;
    /** 滑块宽度 */
    sliderWidth: number;
    /** 滑块垂直偏移量 */
    offsetY: number;
    /** 安全值（从图片中提取） */
    safeValue: string;
  };
}

export type GetAuthCaptchaResponse =
  | GetAuthCaptchaSuccessResponse
  | CommonFailedResponse<ActionFailType.MissingArg | ActionFailType.Unknown>;

export const getAuthCaptcha = async (
  cookieHeader: string,
  id: string,
): Promise<GetAuthCaptchaResponse> => {
  try {
    const response = await fetch(`${AUTH_CAPTCHA_URL}?_=${Date.now()}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookieHeader,
        Referer: AUTH_LOGIN_URL,
        "User-Agent": "inNENU service",
      },
      body: `userName=${id}&authCodeTypeName=reAuthDynamicCodeType`,
    });

    const { bigImage, smallImage, tagWidth, yHeight } =
      (await response.json()) as RawAuthCaptchaResponse;

    // Extract safeValue from smallImage
    let safeValue = "";

    // Use Buffer to decode base64 (Node.js environment)
    const imageBuffer = Buffer.from(smallImage, "base64");
    const dataLength = imageBuffer.length;

    // Extract last 16 bytes as safeValue
    for (let i = dataLength - 16; i < dataLength; i++) {
      safeValue += String.fromCharCode(imageBuffer[i]);
    }

    return {
      success: true,
      data: {
        slider: `data:image/png;base64,${smallImage}`,
        bg: `data:image/png;base64,${bigImage}`,
        offsetY: yHeight,
        sliderWidth: tagWidth,
        safeValue,
      },
    };
  } catch (error) {
    console.error(error);

    return UnknownResponse("获取验证码失败");
  }
};

const VERIFY_CAPTCHA_URL = `${AUTH_SERVER}/authserver/common/verifySliderCaptcha.htl`;
const CAPTCHA_CANVAS_WIDTH = 295;

type RawVerifyAuthCaptchaResponse =
  | {
      errorCode: 1;
      errorMsg: "success";
    }
  | {
      errorCode: 0;
      errorMsg: "error";
    };

export const verifyAuthCaptcha = async (
  cookieHeader: string,
  moveLength: number,
  tracks: SliderTrackPoint[],
  safeValue: string,
): Promise<{ success: boolean }> => {
  // Prepare the verification data
  const sign = authEncrypt(
    JSON.stringify({ canvasLength: CAPTCHA_CANVAS_WIDTH, moveLength, tracks }),
    safeValue,
  );

  const response = await fetch(VERIFY_CAPTCHA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: cookieHeader,
      Referer: AUTH_LOGIN_URL,
      "User-Agent": "inNENU service",
    },
    body: `sign=${encodeURIComponent(sign)}`,
  });

  const result = (await response.json()) as RawVerifyAuthCaptchaResponse;

  return {
    success: result.errorMsg === "success",
  };
};

export interface GetAuthCaptchaOptions {
  /** 学号 */
  id: string;
  cookie?: CookieType[];
}

export interface VerifyAuthCaptchaOptions {
  /** 滑动距离 */
  moveLength: number;
  /** 滑块轨迹数组 */
  tracks: SliderTrackPoint[];
  /** 安全值 */
  safeValue: string;
  cookie?: CookieType[];
}

export interface VerifyAuthCaptchaResponse {
  success: boolean;
}

export type AuthCaptchaOptions =
  | GetAuthCaptchaOptions
  | VerifyAuthCaptchaOptions;

export type AuthCaptchaResponse =
  | GetAuthCaptchaResponse
  | VerifyAuthCaptchaResponse;

export const authCaptchaHandler = request<
  AuthCaptchaResponse,
  AuthCaptchaOptions,
  { id?: string }
>(async (req, res) => {
  try {
    if (req.method === "GET") {
      const id = req.params.id;
      const cookieHeader = req.headers.cookie;

      if (!id) return res.json(MissingArgResponse("id"));
      if (!cookieHeader) return MissingCredentialResponse;

      return res.json(await getAuthCaptcha(cookieHeader, id));
    }

    const cookieHeader = req.body?.cookie
      ? req.body.cookie.map(({ name, value }) => `${name}=${value}`).join("; ")
      : req.headers.cookie;

    if (!cookieHeader) return MissingCredentialResponse;

    if ("id" in req.body) {
      return res.json(await getAuthCaptcha(cookieHeader, req.body.id));
    }

    if (!req.body.moveLength || !req.body.tracks)
      return res.json(MissingArgResponse("moveLength, tracks"));

    if (!req.body.safeValue) return res.json(MissingArgResponse("safeValue"));

    const result = await verifyAuthCaptcha(
      cookieHeader,
      req.body.moveLength,
      req.body.tracks,
      req.body.safeValue,
    );

    return res.json(result);
  } catch {
    return res.json(UnknownResponse("验证码错误"));
  }
});
