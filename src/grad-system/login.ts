import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";

import { GRAD_SYSTEM_SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/index.js";
import { authLogin } from "../auth/index.js";
import {
  ActionFailType,
  MissingCredentialResponse,
  UnknownResponse,
} from "../config/index.js";
import type {
  AccountInfo,
  CommonFailedResponse,
  LoginOptions,
} from "../typings.js";
import { request } from "../utils/index.js";

export interface GradSystemLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type GradSystemLoginResult =
  | GradSystemLoginSuccessResult
  | AuthLoginFailedResponse;

export const gradSystemLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<GradSystemLoginResult> => {
  const result = await authLogin({
    ...options,
    service: `${GRAD_SYSTEM_SERVER}/HProg/yjsy/index_pc.php`,
    cookieStore,
  });

  if (!result.success) {
    console.error(result.msg);

    return result;
  }

  const ticketResponse = await fetch(result.location, {
    headers: {
      Cookie: cookieStore.getHeader(result.location),
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(ticketResponse, result.location);

  if (ticketResponse.status !== 302) {
    console.log(
      "Failed to resolve ticket response",
      result.location,
      ticketResponse.status,
    );

    return UnknownResponse("登录失败");
  }

  const finalLocation = ticketResponse.headers.get("Location");

  if (finalLocation?.includes("http://wafnenu.nenu.edu.cn/offCampus.html"))
    return {
      success: false,
      type: ActionFailType.Forbidden,
      msg: "此账户无法登录研究生教学服务系统",
    };

  if (finalLocation === "https://pg.nenu.edu.cn/HProg/yjsy/index_pc.php") {
    const indexResponse = await fetch(finalLocation, {
      headers: {
        Cookie: cookieStore.getHeader(finalLocation),
      },
    });

    cookieStore.applyResponse(indexResponse, finalLocation);

    return {
      success: true,
      cookieStore,
    };
  }

  return UnknownResponse("登录失败");
};

export interface GradSystemLoginSuccessResponse {
  success: true;
  cookies: CookieType[];
}

export type GradSystemLoginResponse =
  | GradSystemLoginSuccessResponse
  | AuthLoginFailedResponse;

export const loginToGradSystem = request<
  | GradSystemLoginResponse
  | CommonFailedResponse<ActionFailType.MissingCredential>,
  LoginOptions
>(async (req, res, next) => {
  if (!req.body) {
    return res.json(MissingCredentialResponse);
  }

  const { id, password, authToken } = req.body;

  if (id && password && authToken) {
    const result = await gradSystemLogin({ id, password, authToken });

    if (!result.success) return res.json(result);

    req.headers.cookie = result.cookieStore.getHeader(GRAD_SYSTEM_SERVER);
  } else if (!req.headers.cookie) {
    return res.json(MissingCredentialResponse);
  }

  return next();
});

export const gradSystemLoginHandler = request<
  GradSystemLoginResponse,
  AccountInfo
>(async (req, res) => {
  const result = await gradSystemLogin(req.body);

  if (result.success) {
    const cookies = result.cookieStore
      .getAllCookies()
      .map((item) => item.toJSON());

    cookies.forEach(({ name, value, ...rest }) => {
      res.cookie(name, value, rest);
    });

    return res.json({
      success: true,
      cookies,
    });
  }

  return res.json(result);
});
