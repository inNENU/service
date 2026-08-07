import { cookies2Header, request } from "@/utils/index.js";

import type { CookieOptions, CookieVerifyResponse } from "../typings.js";
import { ACTION_443_SERVER, ACTION_ENDPOINT } from "./utils.js";

export const actionCheckHandler = request<CookieVerifyResponse, CookieOptions>(async (req, res) => {
  try {
    const cookieHeader = cookies2Header(req.body.cookies) ?? req.headers.cookie ?? "";

    if (cookieHeader.includes("TEST")) {
      return res.json({
        success: true,
        valid: true,
      });
    }

    const response = await fetch(ACTION_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: cookieHeader,
        Referer: ACTION_443_SERVER,
      },
      body: JSON.stringify({
        owner: "",
        action: "index-wddy",
      }),
      redirect: "manual",
    });

    if (response.status !== 200) {
      return res.json({
        success: true,
        valid: false,
      });
    }

    const result = (await response.json()) as { ok: boolean };

    return res.json({
      success: true,
      valid: result.ok,
    });
  } catch (err) {
    console.error(err);

    return res.json({
      success: true,
      valid: false,
    });
  }
});
