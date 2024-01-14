import type { CookieType } from "@mptool/net";
import type { RequestHandler } from "express";

import { LIBRARY_SERVER } from "./utils.js";
import type { AuthLoginFailedResult } from "../auth/index.js";
import { authLogin } from "../auth/index.js";
import type { EmptyObject, LoginOptions } from "../typings.js";
import { CookieStore, EDGE_USER_AGENT_HEADERS } from "../utils/index.js";

export interface LibraryLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
}

export type LibraryLoginResult =
  | LibraryLoginSuccessResult
  | AuthLoginFailedResult;

export const libraryLogin = async (
  options: LoginOptions,
  cookieStore = new CookieStore(),
): Promise<LibraryLoginResult> => {
  const result = await authLogin(options, {
    service: `${LIBRARY_SERVER}/sso/login/3rd/21248`,
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

  console.log("Login location", result.location);

  const ticketResponse = await fetch(result.location, {
    headers: {
      Cookie: cookieStore.getHeader(result.location),
      Referer: LIBRARY_SERVER,
      ...EDGE_USER_AGENT_HEADERS,
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(ticketResponse, result.location);

  const syncCookieUrl = `${LIBRARY_SERVER}/sso-login/cookie/sync`;

  const cookieResponse = await fetch(syncCookieUrl, {
    method: "POST",
    headers: {
      Cookie: cookieStore.getHeader(syncCookieUrl),
      ...EDGE_USER_AGENT_HEADERS,
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(cookieResponse, syncCookieUrl);

  return {
    success: true,
    cookieStore,
  };
};

export const zhixingLogin = async (
  options: LoginOptions,
  cookieStore = new CookieStore(),
): Promise<LibraryLoginResult> => {
  const result = await authLogin(options, {
    service:
      "http://uas.metaauth.com/cas-nenu/login.jsp/serviceIP=www.metaauth.com/",
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

  console.log("Login location", result.location);

  const ticketResponse = await fetch(result.location, {
    headers: {
      Cookie: cookieStore.getHeader(result.location),
      Referer: LIBRARY_SERVER,
      ...EDGE_USER_AGENT_HEADERS,
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(ticketResponse, result.location);

  const syncCookieUrl = `${LIBRARY_SERVER}/sso-login/cookie/sync`;

  const cookieResponse = await fetch(syncCookieUrl, {
    method: "POST",
    headers: {
      Cookie: cookieStore.getHeader(syncCookieUrl),
      ...EDGE_USER_AGENT_HEADERS,
    },
    redirect: "manual",
  });

  cookieStore.applyResponse(cookieResponse, syncCookieUrl);

  return {
    success: true,
    cookieStore,
  };
};

export interface LibraryLoginSuccessResponse {
  success: true;
  cookies: CookieType[];
}

export type LibraryLoginsResponse =
  | LibraryLoginSuccessResponse
  | AuthLoginFailedResult;

export const libraryLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const result = await libraryLogin(req.body);

    if (result.success) {
      const cookies = result.cookieStore
        .getAllCookies()
        .map((item) => item.toJSON());

      cookies.forEach(({ name, value, ...rest }) => {
        res.cookie(name, value, rest);
      });

      return res.json(<LibraryLoginSuccessResponse>{
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
