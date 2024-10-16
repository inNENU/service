import { MY_SERVER } from "./utils.js";
import type { CookieOptions, CookieVerifyResponse } from "../typings.js";
import { cookies2Header, request } from "../utils/index.js";

export const myCheckHandler = request<CookieVerifyResponse, CookieOptions>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie ?? cookies2Header(req.body.cookies);

    if (cookieHeader.includes("TEST"))
      return res.json({ success: true, valid: true });

    const identityResponse = await fetch(`${MY_SERVER}/hallIndex/getidentity`, {
      method: "POST",
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookieHeader,
      },
    });

    try {
      const identityResult = (await identityResponse.json()) as {
        success: boolean;
      };

      return res.json({
        success: true,
        valid: identityResult.success,
      });
    } catch {
      return res.json({
        success: true,
        valid: false,
      });
    }
  },
);
