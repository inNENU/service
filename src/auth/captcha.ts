import type { CookieType } from "@mptool/net";

import { AUTH_CAPTCHA_URL, AUTH_LOGIN_URL, AUTH_SERVER } from "./utils.js";
import type { ActionFailType } from "../config/index.js";
import {
  MissingArgResponse,
  MissingCredentialResponse,
} from "../config/index.js";
import type { CommonFailedResponse } from "../typings.js";
import { middleware } from "../utils/index.js";

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
  };
}

export type GetAuthCaptchaResponse =
  | GetAuthCaptchaSuccessResponse
  | CommonFailedResponse<ActionFailType.MissingArg | ActionFailType.Unknown>;

export const getAuthCaptcha = async (
  cookieHeader: string,
  id: string,
): Promise<GetAuthCaptchaResponse> => {
  const response = await fetch(`${AUTH_CAPTCHA_URL}?_=${Date.now()}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: cookieHeader,
      Referer: AUTH_LOGIN_URL,
      "User-Agent": "inNENU",
    },
    body: `userName=${id}&authCodeTypeName=reAuthDynamicCodeType`,
  });

  const { bigImage, smallImage, tagWidth, yHeight } =
    (await response.json()) as RawAuthCaptchaResponse;

  return {
    success: true,
    data: {
      slider: `data:image/png;base64,${smallImage}`,
      bg: `data:image/png;base64,${bigImage}`,
      offsetY: yHeight,
      sliderWidth: tagWidth,
    },
  };
};

const VERIFY_CAPTCHA_URL = `${AUTH_SERVER}/authserver/common/verifySliderCaptcha.htl`;

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
  distance: number,
  width: number,
): Promise<{ success: boolean }> => {
  const response = await fetch(VERIFY_CAPTCHA_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      Cookie: cookieHeader,
      Referer: AUTH_LOGIN_URL,
      "User-Agent": "inNENU",
    },
    body: `canvasLength=${width}&moveLength=${distance}`,
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
  distance: number;
  /** 总宽度 */
  width?: number;
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

export const authCaptchaHandler = middleware<
  AuthCaptchaResponse,
  AuthCaptchaOptions,
  { id?: string }
>(async (req, res) => {
  const cookieHeader = req.body.cookie
    ? req.body.cookie.map(({ name, value }) => `${name}=${value}`).join("; ")
    : req.headers.cookie;

  if (!cookieHeader) return MissingCredentialResponse;

  if (req.method === "GET") {
    const id = req.params.id;

    if (!id) return res.json(MissingArgResponse("id"));

    return res.json(await getAuthCaptcha(cookieHeader, id));
  }

  if ("id" in req.body) {
    return res.json(await getAuthCaptcha(cookieHeader, req.body.id));
  }

  if (!req.body.distance) return res.json(MissingArgResponse("id or distance"));

  const result = await verifyAuthCaptcha(
    cookieHeader,
    req.body.distance,
    req.body.width ?? 295,
  );

  return res.json(result);
});
