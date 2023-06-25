import type { Cookie } from "set-cookie-parser";

import { IE_8_USER_AGENT, getCookieHeader } from "../utils/index.js";

export const getSessionId = async (cookies: Cookie[]): Promise<string> => {
  const sessionIdResponse = await fetch(
    "https://dsjx.webvpn.nenu.edu.cn/dwr/engine.js",
    {
      headers: {
        Cookie: getCookieHeader(cookies),
        Referer:
          "https://dsjx.webvpn.nenu.edu.cn/framework/menuleft.jsp?fater=&winid=win1",
        "User-Agent": IE_8_USER_AGENT,
      },
    }
  );

  console.log(sessionIdResponse.status);
  const sessionIdContent = await sessionIdResponse.text();

  // console.log(sessionIdContent);

  const sessionId = /dwr.engine._origScriptSessionId = "(.*?)";/.exec(
    sessionIdContent
  )![1];

  console.log("Getting new sessionId", sessionId);

  return sessionId;
};

// IE always rounds the time to the nearest 100ms
export const getTimeStamp = (): number => {
  const time = new Date().getMilliseconds();

  return Math.floor(time / 100) * 100;
};
