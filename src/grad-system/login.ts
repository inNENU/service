import type { CookieType } from "@mptool/net";
import { CookieStore } from "@mptool/net";
import type { RequestHandler } from "express";

import { SERVER } from "./utils.js";
import type { AuthLoginFailedResponse } from "../auth/login.js";
import { authLogin } from "../auth/login.js";
import { ActionFailType, UnknownResponse } from "../config/index.js";
import type { AccountInfo, EmptyObject } from "../typings.js";

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
    service: `${SERVER}/HProg/yjsy/index_pc.php`,
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
    } as GradSystemLoginSuccessResult;
  }

  return UnknownResponse("登录失败");
};

export interface GradSystemLoginSuccessResponse {
  success: true;
  /** @deprecated */
  cookies: CookieType[];
}

export type GradSystemLoginResponse =
  | GradSystemLoginSuccessResponse
  | AuthLoginFailedResponse;

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

    return res.json(UnknownResponse(message));
  }
};
