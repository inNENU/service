import type { RequestHandler } from "express";

import { LoginFailType } from "../config/loginFailTypes.js";
import type {
  CommonFailedResponse,
  EmptyObject,
  LoginOptions,
} from "../typings.js";
import {
  CookieStore,
  getResponseContent,
  isNumber,
  isPlainObject,
  isString,
  readResponseContent,
} from "../utils/index.js";

export interface SelectLoginSuccessResponse {
  success: true;
  server: string;
}

const SERVER_REG = /;tmpKc\[0\] =\s+"(.*?)";/g;

export interface SelectLoginSuccessResult {
  success: true;
  cookieStore: CookieStore;
  server: string;
}

export interface SelectLoginFailResult extends CommonFailedResponse {
  type?: LoginFailType.Closed | LoginFailType.WrongPassword;
}

export type SelectLoginResult =
  | SelectLoginSuccessResult
  | SelectLoginFailResult;

export const selectLogin = async (
  { id, password }: LoginOptions,
  cookieStore = new CookieStore(),
): Promise<SelectLoginResult> => {
  const isUnder = id.toString()[4] === "0";

  if (!isUnder)
    return {
      success: false,
      msg: "研究生选课已于2024年1月使用全新系统，暂未适配。",
    };

  return {
    success: false,
    msg: "本次教务处首次使用全新选课系统，暂未适配",
  };

  const homePage = isUnder
    ? "http://xk.nenu.edu.cn"
    : "http://yjsxk.nenu.edu.cn/";

  const homePageResponse = await fetch(homePage);

  cookieStore.applyResponse(homePageResponse, homePage);

  if (homePageResponse.status !== 200)
    return {
      success: false,
      type: LoginFailType.Closed,
      msg: "无法连接到选课系统",
    } as CommonFailedResponse;

  const content = await getResponseContent(homePageResponse);

  const servers = Array.from(content.matchAll(SERVER_REG)).map(
    (item) => item[1],
  );

  const server = servers[id % servers.length];
  const url = `${server}xk/LoginToXkLdap`;

  const loginResponse = await fetch(`${url}?url=${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieStore.getHeader(url),
      Origin: homePage,
      Referer: `${url}?url=${url}`,
    },
    body: new URLSearchParams({
      IDToken1: id.toString(),
      IDToken2: password,
      RANDOMCODE: "1234",
      ymyzm: "1234",
    }),
    redirect: "manual",
  });

  cookieStore.applyResponse(loginResponse, url);

  if (loginResponse.status === 302) {
    const location = loginResponse.headers.get("Location")!;

    const url = location.startsWith("/")
      ? `${server.replace(/\/$/, "")}${location}`
      : location;

    const finalResponse = await fetch(url, {
      headers: {
        Cookie: cookieStore.getHeader(url),
      },
    });

    cookieStore.applyResponse(finalResponse, location);

    const contentTypeHeader = finalResponse.headers.get("Content-Type")!;
    const text = contentTypeHeader.includes("charset=GBK")
      ? await readResponseContent(finalResponse)
      : await finalResponse.text();

    if (text.includes("请先登录系统"))
      return {
        success: false,
        msg: "登录失败",
      } as CommonFailedResponse;

    return {
      success: true,
      cookieStore,
      server,
    } as SelectLoginSuccessResult;
  }

  return {
    success: false,
    type: LoginFailType.WrongPassword,
    msg: "用户名或密码错误",
  } as CommonFailedResponse;
};

export const selectLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const { body } = req;

    if (isPlainObject(body) && isNumber(body.id) && isString(body.password)) {
      const result = await selectLogin(body);

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
          server: result.server,
        } as SelectLoginSuccessResponse);
      }

      return res.json(result);
    }

    return res.json({
      success: false,
      msg: "请传入必须参数",
    } as CommonFailedResponse);
  } catch (err) {
    const { message } = err as Error;

    console.error(err);
    res.json({
      success: false,
      msg: message,
    } as CommonFailedResponse);
  }
};
