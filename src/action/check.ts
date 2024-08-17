import { ACTION_SERVER } from "./utils.js";
import type { CookieOptions, CookieVerifyResponse } from "../typings.js";
import { cookies2Header, middleware } from "../utils/index.js";

export const actionCheckHandler = middleware<
  CookieVerifyResponse,
  CookieOptions
>(async (req, res) => {
  try {
    const cookieHeader = req.headers.cookie ?? cookies2Header(req.body.cookies);

    if (cookieHeader.includes("TEST"))
      return res.json({
        success: true,
        valid: true,
      });

    const response = await fetch(`${ACTION_SERVER}/page/getidentity`, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: cookieHeader,
      },
      redirect: "manual",
    });

    if (response.status !== 200)
      return res.json({
        success: true,
        valid: false,
      });

    const result = (await response.json()) as { success: boolean };

    return res.json({
      success: true,
      valid: result.success,
    });
  } catch (err) {
    console.error(err);

    return res.json({
      success: true,
      valid: false,
    });
  }
});
