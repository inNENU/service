import type { RequestHandler } from "express";

import type {
  SelectBaseFailedResponse,
  SelectBaseOptions,
  SelectBaseSuccessResponse,
} from "./typings.js";
import type { EmptyObject, LoginOptions } from "../typings.js";
import {
  getResponseCookies,
  isNumber,
  isPlainObject,
  isString,
} from "../utils/index.js";

export type SelectLoginSuccessResponse = SelectBaseOptions &
  SelectBaseSuccessResponse;

export type SelectLoginFailedResponse = SelectBaseFailedResponse;

export const selectLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  try {
    const { body } = req;

    if (isPlainObject(body) && isNumber(body.id) && isString(body.password)) {
      const { id, password } = body;

      console.log("Login with", id, password);

      const mainPageResponse = await fetch("http://xk.nenu.edu.cn");

      if (mainPageResponse.status !== 200)
        return res.json(<SelectLoginFailedResponse>{
          success: false,
          msg: "无法连接到选课系统",
        });

      const cookieHeader = mainPageResponse.headers.get("Set-Cookie")!;
      const content = await mainPageResponse.text();

      const servers = [];
      const serverReg = /;tmpKc\[0\] =\s+"(.*?)";/g;

      let match;

      while ((match = serverReg.exec(content))) servers.push(match[1]);

      console.log("Available servers:", servers);
      const server = servers[id % servers.length];

      console.log("Using server:", server);
      const url = `${server}xk/LoginToXkLdap`;

      const headers = new Headers({
        "Cache-Control": "max-age=0",
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: cookieHeader,
        DNT: "1",
        Origin: "http://xk.nenu.edu.cn",
      });

      console.log(`Login at ${url}`);

      const loginResponse = await fetch(`${url}?url=${url}`, {
        method: "POST",
        headers,
        redirect: "manual",
        body: `IDToken1=${id}&IDToken2=${password}&RANDOMCODE=1234&ymyzm=1234`,
      });

      if (loginResponse.status === 302) {
        const cookies = getResponseCookies(loginResponse);

        console.log("Getting cookie:", cookies);

        return res.json(<SelectLoginSuccessResponse>{
          success: true,

          cookies: getResponseCookies(loginResponse).map(
            ({ name, value }) => `${name}=${value}`,
          ),
          server,
        });
      }

      return res.json(<SelectLoginFailedResponse>{
        success: false,
        msg: "用户名或密码错误",
      });
    }

    return res.json(<SelectLoginFailedResponse>{
      success: false,
      msg: "请传入必须参数",
    });
  } catch (err) {
    const { message } = <Error>err;

    console.error(err);
    res.json(<SelectLoginFailedResponse>{
      success: false,
      msg: message,
    });
  }
};
