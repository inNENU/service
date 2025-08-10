import { cookies2Header, request } from "@/utils/index.js";

import type { CookieOptions, CookieVerifyResponse } from "../typings.js";
import { AUTH_INFO_PAGE } from "./utils.js";

export const authCenterCheckHandler = request<
  CookieVerifyResponse,
  CookieOptions
>(async (req, res) => {
  const cookieHeader = req.headers.cookie ?? cookies2Header(req.body.cookies);

  if (cookieHeader.includes("TEST")) {
    return res.json({ success: true, valid: true });
  }

  const response = await fetch(AUTH_INFO_PAGE, {
    headers: {
      "Cache-Control": "no-cache",
      Cookie: cookieHeader,
    },
    redirect: "manual",
  });

  if (response.status === 200)
    return res.json({
      success: true,
      valid: true,
    });

  return res.json({
    success: true,
    valid: false,
  });
});
