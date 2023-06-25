import type { RequestHandler } from "express";

import type { LoginOptions } from "../auth/login.js";
import { login } from "../auth/login.js";
import type { EmptyObject } from "../typings.js";
import { getCookieHeader, getCookies } from "../utils/index.js";

export const dsjxLoginHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  LoginOptions
> = async (req, res) => {
  const mainPageResponse = await fetch(
    "http://dsjx.nenu.edu.cn/framework/main.jsp"
  );

  const systemCookies = getCookies(mainPageResponse);

  const result = await login(
    req.body,
    "http://dsjx.nenu.edu.cn/framework/main.jsp"
  );

  if (
    result.status === "failed" ||
    !result.location ||
    !result.location.startsWith("http://dsjx.nenu.edu.cn/framework/main.jsp")
  ) {
    console.error("catch");

    return res.json({ status: "failed", msg: "登录失败" });
  }

  const authLocation = result.location;

  // 处理多一次的重定向
  // if (authLocation === "http://dsjx.nenu.edu.cn/framework/main.jsp") {
  //   console.warn("Extra handling redirect");
  //   const finalResponse = await fetch(authLocation, {
  //     headers: new Headers({
  //       Cookie: systemCookies.map((cookie) => cookie).join(", "),
  //     }),
  //     redirect: "manual",
  //   });

  //   authLocation = finalResponse.headers.get("Location");

  //   systemCookies.push(...getCookies(finalResponse));

  //   if (
  //     finalResponse.status !== 302 ||
  //     !authLocation ||
  //     !authLocation.startsWith(
  //       "http://dsjx.nenu.edu.cn/framework/main.jsp?ticket"
  //     )
  //   )
  //     return res.json({ status: "failed", msg: "登录失败" });
  // }

  const ticketHeaders = {
    Cookie: getCookieHeader([
      systemCookies.find((item) => item.name === "acw_tc")!,
      result.cookies.find((item) => item.name === "iPlanetDirectoryPro")!,
    ]),
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36 Edg/114.0.1823.51",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Upgrade-Insecure-Requests": "1",
    DNT: "1",
    Referer: "http://dsjx.nenu.edu.cn/",
  };

  console.log("ticket headers", ticketHeaders);

  const ticketResponse = await fetch(authLocation, {
    headers: new Headers(ticketHeaders),
    redirect: "manual",
  });

  systemCookies.push(...getCookies(ticketResponse));

  console.log(
    "ticket",
    ticketResponse.status,
    ticketResponse.headers.get("Location")
  );

  if (ticketResponse.status !== 302)
    return res.json({ status: "failed", msg: "登录失败" });

  const finalLocation = ticketResponse.headers.get("Location");

  if (
    finalLocation?.match(
      /^http:\/\/dsjx\.nenu\.edu\.cn\/framework\/main\.jsp(?:;jsessionid=.*)?$/
    )
  )
    return res.json({
      status: "success",
      cookies: systemCookies,
    });

  return res.json({ status: "failed", msg: "登录失败" });
};
