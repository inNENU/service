import type { RequestHandler } from "express";

import { UNDER_STUDY_SERVER } from "./utils.js";
import type {
  CookieOptions,
  CookieVerifyResponse,
  EmptyObject,
} from "../typings.js";
import { EDGE_USER_AGENT_HEADERS, cookies2Header } from "../utils/index.js";

export const underStudyCheckHandler: RequestHandler<
  EmptyObject,
  EmptyObject,
  CookieOptions
> = async (req, res) => {
  try {
    const cookieHeader = req.headers.cookie ?? cookies2Header(req.body.cookies);

    if (cookieHeader.includes("TEST"))
      return res.json({
        success: true,
        valid: true,
      } as CookieVerifyResponse);

    const response = await fetch(UNDER_STUDY_SERVER, {
      headers: {
        Cookie: cookieHeader,
        ...EDGE_USER_AGENT_HEADERS,
      },
      redirect: "manual",
    });

    if (response.status === 302) {
      const location = response.headers.get("location");

      if (location === `${UNDER_STUDY_SERVER}/new/welcome.page`)
        return res.json({
          success: true,
          valid: true,
        } as CookieVerifyResponse);
    }

    return res.json({
      success: true,
      valid: false,
    } as CookieVerifyResponse);
  } catch {
    return res.json({
      success: true,
      valid: false,
    } as CookieVerifyResponse);
  }
};
