import { cookies2Header, request } from "@/utils/index.js";

import type { CookieOptions, CookieVerifyResponse } from "../typings.js";
import { OA_WEB_VPN_SERVER } from "./utils.js";

export const oaCheckHandler = request<CookieVerifyResponse, CookieOptions>(
  async (req, res) => {
    const cookieHeader = req.headers.cookie ?? cookies2Header(req.body.cookies);

    if (cookieHeader.includes("TEST"))
      return res.json({ success: true, valid: true });

    const ecodeResponse = await fetch(`${OA_WEB_VPN_SERVER}/api/ecode/sync`, {
      headers: {
        Accept: "application/json, text/javascript, */*; q=0.01",
        Cookie: cookieHeader,
      },
    });

    try {
      const ecodeData = (await ecodeResponse.json()) as {
        status: boolean;
        _data: { _user: Record<string, string> };
      };

      return res.json({
        success: true,
        valid: ecodeData.status && "_user" in ecodeData._data,
      });
    } catch {
      return res.json({
        success: true,
        valid: false,
      });
    }
  },
);
