import type { CookieOptions, CookieVerifyResponse } from "../typings.js";
import { UNDER_SYSTEM_SERVER } from "./utils.js";
import { IE_8_USER_AGENT, cookies2Header, request } from "../utils/index.js";

export const underSystemCheckHandler = request<
  CookieVerifyResponse,
  CookieOptions
>(async (req, res) => {
  const cookieHeader = req.headers.cookie ?? cookies2Header(req.body.cookies);

  if (cookieHeader.includes("TEST"))
    return res.json({
      success: true,
      valid: true,
    });

  const response = await fetch(
    `${UNDER_SYSTEM_SERVER}/framework/userInfo_edit.jsp?winid=win6`,
    {
      headers: {
        Cookie: cookieHeader,
        "User-Agent": IE_8_USER_AGENT,
      },
      redirect: "manual",
    },
  );

  if (response.status === 200) {
    const text = await response.text();

    if (text.includes("您登录后过长时间没有操作或您的用户名已经在别处登录！"))
      return res.json({
        success: true,
        valid: false,
      });

    return res.json({
      success: true,
      valid: true,
    });
  }

  return res.json({
    success: true,
    valid: false,
  });
});
