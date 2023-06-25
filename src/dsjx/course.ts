import type { RequestHandler } from "express";
import type { Cookie } from "set-cookie-parser";

import { dsjxLogin } from "./login.js";
import { getTimeStamp } from "./utils.js";
import type { LoginFailedData, LoginOptions } from "../auth/index.js";
import type { EmptyObject } from "../typings.js";
import { IE_8_USER_AGENT, getCookieHeader } from "../utils/index.js";

type AuthOptions = LoginOptions | { cookies: Cookie[]; userID: string };

export type DSJXCourseOptions = AuthOptions & {
  id: number;
  time: string;
};

export const dsjxCourseHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  DSJXCourseOptions
> = async (req, res) => {
  try {
    let cookies: Cookie[] = [];

    const { id, time } = req.body;

    if ("cookies" in req.body) {
      ({ cookies } = req.body);
    } else {
      const result = await dsjxLogin(req.body);

      if (result.status === "failed") return res.json(result);

      ({ cookies } = result);
    }

    const loginResponse = await fetch(
      "https://dsjx.webvpn.nenu.edu.cn/Logon.do?method=logonBySSO",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: getCookieHeader(cookies),
          Referer: "https://dsjx.webvpn.nenu.edu.cn/framework/main.jsp",
          "User-Agent": IE_8_USER_AGENT,
        },
      }
    );

    console.log(loginResponse.status);
    console.log(await loginResponse.text());

    const params = new URLSearchParams({
      method: "goListKbByXs",
      istsxx: "no",
      xnxqh: time,
      zc: "",
      xs0101id: id.toString(),
    });

    console.log("Using params", params);

    const headers = {
      Cookie: getCookieHeader(cookies),
      Referer: `https://dsjx.webvpn.nenu.edu.cn/tkglAction.do?method=kbxxXs&tktime=${getTimeStamp().toString()}`,
      "User-Agent": IE_8_USER_AGENT,
    };

    console.log("Using headers", headers);

    const response = await fetch(
      `https://dsjx.webvpn.nenu.edu.cn/tkglAction.do?${params.toString()}`,
      {
        headers,
      }
    );

    console.log(response.status);

    const content = await response.text();

    console.log(content);

    res.end();
  } catch (err) {
    res.json(<LoginFailedData>{
      status: "failed",
      msg: (<Error>err).message,
    });
  }
};
