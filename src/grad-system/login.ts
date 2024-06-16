import type { CookieType } from "@mptool/net";
import type { RequestHandler } from "express";

import { SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/login.js";
import { authLogin } from "../auth/login.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type { AccountInfo, EmptyObject } from "../typings.js";
import { CookieStore } from "../utils/index.js";

export interface GradSystemLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type GradSystemLoginResult =
  | GradSystemLoginSuccessResult
  | AuthLoginFailedResult;

export const gradSystemLogin = async (
  options: AccountInfo,
  cookieStore = new CookieStore(),
): Promise<GradSystemLoginResult> => {
  const result = await authLogin({
    ...options,
    service: `${SERVER}/HProg/yjsy/index_pc.php`,
    cookieStore,
  });

  if (!result.success) {
    console.error(result.msg);

    return {
      success: false,
      type: result.type,
      msg: result.msg,
    } as AuthLoginFailedResult;
  }

  const ticketResponse = await fetch(result.location, {
    headers: {
      Cookie: cookieStore.getHeader(result.location),
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(ticketResponse, result.location);

  console.log(
    "ticket",
    ticketResponse.headers.get("Location"),
    await ticketResponse.text(),
  );

  if (ticketResponse.status !== 302) {
    console.log("ticket response", await ticketResponse.text());

    return {
      success: false,
      type: LoginFailType.Unknown,
      msg: "登录失败",
    };
  }

  const finalLocation = ticketResponse.headers.get("Location");

  if (finalLocation?.includes("http://wafnenu.nenu.edu.cn/offCampus.html"))
    return {
      success: false,
      type: LoginFailType.Forbidden,
      msg: "此账户无法登录研究生教学服务系统",
    };

  if (finalLocation === "https://math127.nenu.edu.cn/HProg/yjsy/index_pc.php") {
    const indexResponse = await fetch(finalLocation, {
      headers: {
        Cookie: cookieStore.getHeader(finalLocation),
      },
    });

    cookieStore.applyResponse(indexResponse, finalLocation);

    return {
      success: true,
      cookieStore,
    } as GradSystemLoginSuccessResult;
  }

  return {
    success: false,
    type: LoginFailType.Unknown,
    msg: "登录失败",
  };
};

export interface GradSystemLoginSuccessResponse {
  success: true;
  /** @deprecated */
  cookies: CookieType[];
}

export type GradSystemLoginResponse =
  | GradSystemLoginSuccessResponse
  | AuthLoginFailedResult;

export const gradSystemLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  AccountInfo
> = async (req, res) => {
  try {
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
      } as GradSystemLoginSuccessResponse);
    }

    return res.json(result);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);
    res.json({
      success: false,
      msg: message,
    } as AuthLoginFailedResult);
  }
};
