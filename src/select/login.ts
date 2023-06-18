import { RequestHandler } from "express";
import { getCookie } from "../utils/cookie";

export interface SelectLoginOptions {
  id: number;
  password: string;
}

export interface SelectLoginSuccessResponse {
  status: "success";
  cookie: string;
  server: string;
}

export interface SelectLoginFailedResponse {
  status: "failed";
  msg: string;
}

export const selectLoginHandler: RequestHandler = async (req, res) => {
  const { id, password } = <SelectLoginOptions>req.body;

  const mainPageResponse = await fetch("http://xk.nenu.edu.cn");

  const cookieHeader = mainPageResponse.headers.get("Set-Cookie")!;
  const content = await mainPageResponse.text();

  if (typeof id !== "number")
    return res.json({ status: "failed", msg: "学号必须为数字" });

  const servers = /;tmpKc[0] =\s+"(.*)?";/g
    .exec(content)!
    .map(([, link]) => link);

  const server = servers[id % servers.length];
  const url = `${server}qzxk/xk/LoginToXkLdap`;

  const headers = new Headers({
    "Cache-Control": "max-age=0",
    "Content-Type": "application/x-www-form-urlencoded",
    Cookie: cookieHeader,
    DNT: "1",
    Origin: "http://xk.nenu.edu.cn",
  });

  const loginResponse = await fetch(`${url}?url=${url}`, {
    method: "POST",
    headers,
    redirect: "manual",
    body: `IDToken1=${id}&IDToken2=${password}&RANDOMCODE=1234&ymyzm=1234`,
  });

  if (loginResponse.status === 302)
    // @ts-ignore
    res.json({
      status: "success",
      cookie: getCookie(loginResponse),
      server,
    });
  else res.json({ status: "failed", msg: "用户名或密码错误" });
};
