import type { RequestHandler } from "express";

import { SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/login.js";
import { authLogin } from "../auth/login.js";
import { LoginFailType } from "../config/loginFailTypes.js";
import type { CookieType, EmptyObject, LoginOptions } from "../typings.js";
import { CookieStore } from "../utils/index.js";

export interface PostSystemLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type PostSystemLoginResult =
  | PostSystemLoginSuccessResult
  | AuthLoginFailedResult;

export const postSystemLogin = async (
  options: LoginOptions,
  cookieStore = new CookieStore(),
): Promise<PostSystemLoginResult> => {
  const result = await authLogin(options, {
    service: `${SERVER}/HProg/yjsy/index_pc.php`,
    cookieStore,
  });

  if (!result.success) {
    console.error(result.msg);

    return <AuthLoginFailedResult>{
      success: false,
      type: result.type,
      msg: result.msg,
    };
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

    return <PostSystemLoginSuccessResult>{
      success: true,
      cookieStore,
    };
  }

  return {
    success: false,
    type: LoginFailType.Unknown,
    msg: "登录失败",
  };
};

export interface PostSystemLoginSuccessResponse {
  success: true;
  /** @deprecated */
  cookies: CookieType[];
}

export type PostSystemLoginResponse =
  | PostSystemLoginSuccessResponse
  | AuthLoginFailedResult;

export const postSystemLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const result = await postSystemLogin(req.body);

    if (result.success) {
      const cookies = result.cookieStore
        .getAllCookies()
        .map((item) => item.toJSON());

      cookies.forEach(({ name, value, ...rest }) => {
        res.cookie(name, value, rest);
      });

      return res.json(<PostSystemLoginSuccessResponse>{
        success: true,
        cookies,
      });
    }

    return res.json(result);
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<AuthLoginFailedResult>{
      success: false,
      msg: message,
    });
  }
};
