import type { RequestHandler } from "express";

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

export type SelectLoginResult = SelectLoginSuccessResult | CommonFailedResponse;

export const selectLogin = async (
  { id: id, password }: LoginOptions,
  cookieStore = new CookieStore(),
): Promise<SelectLoginResult> => {
  const isUnder = id.toString()[4] === "0";
  const homePage = isUnder
    ? "http://xk.nenu.edu.cn"
    : "http://yjsxk.nenu.edu.cn/";

  const homePageResponse = await fetch(homePage);

  cookieStore.applyResponse(homePageResponse, homePage);

  if (homePageResponse.status !== 200)
    return <CommonFailedResponse>{
      success: false,
      msg: "无法连接到选课系统",
    };

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

    const finalResponse = await fetch(location, {
      headers: {
        Cookie: cookieStore.getHeader(location),
      },
    });

    cookieStore.applyResponse(finalResponse, location);

    const contentTypeHeader = finalResponse.headers.get("Content-Type")!;
    const text = contentTypeHeader.includes("charset=GBK")
      ? await readResponseContent(finalResponse)
      : await finalResponse.text();

    if (text.includes("请先登录系统"))
      return <CommonFailedResponse>{
        success: false,
        msg: "登录失败",
      };

    return <SelectLoginSuccessResult>{
      success: true,
      cookieStore,
      server,
    };
  }

  return <CommonFailedResponse>{
    success: false,
    msg: "用户名或密码错误",
  };
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

        return res.json(<SelectLoginSuccessResponse>{
          success: true,
          cookies,
          server: result.server,
        });
      }

      return res.json(result);
    }

    return res.json(<CommonFailedResponse>{
      success: false,
      msg: "请传入必须参数",
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<CommonFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
